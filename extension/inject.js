// UNMASK Data X-Ray - MAIN world instrumentation.
//
// Runs in the page's own JS context (world: "MAIN") so it can see the real
// window.fetch / XMLHttpRequest / HTMLInputElement that page scripts use.
// Never sends plaintext field values anywhere - only SHA-256 hashes, lengths,
// and other privacy-safe metadata cross the postMessage boundary into the
// isolated content script.
(() => {
  if (window.__unmaskInjected) return;
  window.__unmaskInjected = true;

  const SELF_SRC = (document.currentScript && document.currentScript.src) || '';

  const MAX_REGISTRY = 50;
  const REGISTRY_TTL_MS = 30 * 60 * 1000;
  const DEBOUNCE_MS = 400;
  const MIN_CANDIDATE_LEN = 3;

  // Bounded, in-memory-only registry of recent sensitive field fingerprints.
  // { fieldId, fieldType, hash, length, timestamp }
  const registry = [];
  const fieldMeta = new WeakMap(); // element -> { timer, lastHash }
  const anonIds = new WeakMap();
  let anonCounter = 0;

  const hasCrypto = !!(window.crypto && window.crypto.subtle);

  // Real, minimal status readout for host pages (e.g. the UNMASK console) to
  // check genuine extension state - not a security boundary, just a status
  // flag. Reflects exactly what this script can actually do on this page.
  window.__unmaskStatus = {
    injected: true,
    dataXRayActive: hasCrypto,
    firewallActive: hasCrypto,
  };

  if (!hasCrypto) {
    // Real limitation: Web Crypto's subtle API is only available in secure
    // contexts (https, or http://localhost). On plain http origins this
    // instrumentation cannot fingerprint values at all, and is intentionally
    // a no-op rather than falling back to a fake/weak hash.
    return;
  }

  // ---------- Sensitive field classification (generic, no hardcoded site) ----------

  function labelText(el) {
    try {
      if (el.labels && el.labels.length) {
        return Array.from(el.labels).map((l) => l.textContent || '').join(' ');
      }
    } catch (_) {}
    return '';
  }

  function fieldSignal(el) {
    return [
      el.id || '',
      el.name || '',
      el.getAttribute('aria-label') || '',
      el.getAttribute('autocomplete') || '',
      el.placeholder || '',
      labelText(el)
    ]
      .join(' ')
      .toLowerCase();
  }

  const FIELD_RULES = [
    {
      type: 'password',
      test: (el, sig) =>
        el.type === 'password' ||
        /(current-password|new-password)/.test(el.autocomplete || '') ||
        /pass(word)?/.test(sig)
    },
    {
      type: 'credit-card',
      test: (el, sig) => /cc-number/.test(el.autocomplete || '') || /(card[-_ ]?number|ccnum|creditcard)/.test(sig)
    },
    {
      type: 'cvv',
      test: (el, sig) => /cc-csc/.test(el.autocomplete || '') || /(cvv|cvc|security[-_ ]?code)/.test(sig)
    },
    { type: 'ssn', test: (el, sig) => /(ssn|social[-_ ]?security)/.test(sig) },
    {
      type: 'email',
      test: (el, sig) => el.type === 'email' || /email/.test(el.autocomplete || '') || /email/.test(sig)
    },
    {
      type: 'phone',
      test: (el, sig) => el.type === 'tel' || /tel/.test(el.autocomplete || '') || /(phone|mobile)/.test(sig)
    }
  ];

  function classifyField(el) {
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return null;
    const sig = fieldSignal(el);
    for (const rule of FIELD_RULES) {
      if (rule.test(el, sig)) return rule.type;
    }
    return null;
  }

  function fieldIdentity(el) {
    if (el.id) return el.id;
    if (el.name) return el.name;
    let anon = anonIds.get(el);
    if (!anon) {
      anon = `anon-field-${++anonCounter}`;
      anonIds.set(el, anon);
    }
    return anon;
  }

  // ---------- Fingerprinting ----------

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function pruneRegistry() {
    const cutoff = Date.now() - REGISTRY_TTL_MS;
    while (registry.length && registry[0].timestamp < cutoff) registry.shift();
    while (registry.length > MAX_REGISTRY) registry.shift();
  }

  async function recordFieldValue(el) {
    const fieldType = classifyField(el);
    const value = el.value;
    if (!fieldType || !value) return;

    const hash = await sha256Hex(value);
    const meta = fieldMeta.get(el) || {};
    if (meta.lastHash === hash) return; // value unchanged since last record
    meta.lastHash = hash;
    fieldMeta.set(el, meta);

    registry.push({
      fieldId: fieldIdentity(el),
      fieldType,
      hash,
      length: value.length,
      timestamp: Date.now()
    });
    pruneRegistry();
  }

  function scheduleRecord(el) {
    if (!classifyField(el)) return;
    const meta = fieldMeta.get(el) || {};
    if (meta.timer) clearTimeout(meta.timer);
    meta.timer = setTimeout(() => recordFieldValue(el), DEBOUNCE_MS);
    fieldMeta.set(el, meta);
  }

  // Real user typing / synthetic dispatchEvent('input') both surface here.
  document.addEventListener('input', (e) => scheduleRecord(e.target), true);
  document.addEventListener(
    'change',
    (e) => {
      const meta = fieldMeta.get(e.target);
      if (meta && meta.timer) clearTimeout(meta.timer);
      recordFieldValue(e.target);
    },
    true
  );

  // Programmatic assignment (frameworks, password managers, page scripts
  // setting .value directly) does not always dispatch an 'input' event, so
  // the underlying property setter is also instrumented.
  function patchValueProperty(ctor) {
    const desc = Object.getOwnPropertyDescriptor(ctor.prototype, 'value');
    if (!desc || !desc.set || !desc.get) return;
    Object.defineProperty(ctor.prototype, 'value', {
      configurable: true,
      enumerable: desc.enumerable,
      get() {
        return desc.get.call(this);
      },
      set(v) {
        desc.set.call(this, v);
        scheduleRecord(this);
      }
    });
  }
  patchValueProperty(window.HTMLInputElement);
  patchValueProperty(window.HTMLTextAreaElement);

  // ---------- Script attribution (heuristic, real stack inspection) ----------

  function attributeScript() {
    try {
      const stack = new Error().stack || '';
      const lines = stack.split('\n').slice(1);
      for (const line of lines) {
        if (SELF_SRC && line.includes(SELF_SRC)) continue;
        const match = line.match(/(https?:\/\/[^\s)]+|chrome-extension:\/\/[^\s)]+)/);
        if (match) {
          try {
            return new URL(match[1]).origin;
          } catch (_) {
            return match[1];
          }
        }
      }
    } catch (_) {}
    // Attribution genuinely could not be established from available stack
    // information - never invent an origin.
    return 'unknown';
  }

  // ---------- Network body inspection (no stream consumption of the real request) ----------

  async function bodyToText(body) {
    if (body === undefined || body === null) return null;
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      const parts = [];
      for (const [k, v] of body.entries()) {
        if (typeof v === 'string') parts.push(`${k}=${v}`);
      }
      return parts.join('&');
    }
    if (body instanceof Blob) {
      try {
        return await body.text();
      } catch (_) {
        return null;
      }
    }
    if (body instanceof ArrayBuffer) {
      try {
        return new TextDecoder().decode(body);
      } catch (_) {
        return null;
      }
    }
    if (ArrayBuffer.isView(body)) {
      try {
        return new TextDecoder().decode(body.buffer);
      } catch (_) {
        return null;
      }
    }
    // Real limitation: a ReadableStream request body cannot be inspected
    // without consuming/teeing it, which risks breaking the page's real
    // request. It is intentionally left uninspected rather than faked.
    return null;
  }

  async function extractBodyText(input, init) {
    try {
      if (init && init.body !== undefined && init.body !== null) {
        return await bodyToText(init.body);
      }
      if (typeof Request !== 'undefined' && input instanceof Request && input.body) {
        // clone() lets us read the body without disturbing the original
        // request that will actually be sent.
        return await input.clone().text();
      }
    } catch (_) {}
    return null;
  }

  function collectJsonStrings(value, out, depth) {
    if (depth > 5 || value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.add(String(value));
    } else if (Array.isArray(value)) {
      value.forEach((v) => collectJsonStrings(v, out, depth + 1));
    } else if (typeof value === 'object') {
      Object.values(value).forEach((v) => collectJsonStrings(v, out, depth + 1));
    }
  }

  function extractCandidates(bodyText) {
    const candidates = new Set();
    if (!bodyText) return candidates;
    candidates.add(bodyText.trim());
    try {
      collectJsonStrings(JSON.parse(bodyText), candidates, 0);
    } catch (_) {}
    try {
      for (const [, v] of new URLSearchParams(bodyText).entries()) {
        if (v) candidates.add(v);
      }
    } catch (_) {}
    return candidates;
  }

  async function correlate(bodyText) {
    const candidates = extractCandidates(bodyText);
    if (!candidates.size) return [];
    pruneRegistry();
    const matches = [];
    for (const candidate of candidates) {
      if (!candidate || candidate.length < MIN_CANDIDATE_LEN) continue;
      const hash = await sha256Hex(candidate);
      for (const entry of registry) {
        if (entry.hash === hash) matches.push(entry);
      }
    }
    return matches;
  }

  // ---------- Firewall policy (real origin / registrable-site comparison) ----------
  //
  // Deterministic, minimal policy: a sensitive-field egress is allowed only
  // when it targets the same "site" as the current page. No trust matrix,
  // no allowlist to maintain - just a same-site check with real handling for
  // localhost dev origins (where "*.localhost" subdomains must NOT be
  // collapsed into one trusted site) and a practical eTLD+1 approximation
  // for public domains (no public-suffix-list dependency, so multi-part
  // TLDs like "co.uk" are a known imprecision - see report).

  function isIpLiteral(hostname) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
  }

  function siteFor(url) {
    const hostname = url.hostname;
    if (isIpLiteral(hostname) || hostname === 'localhost' || hostname.endsWith('.localhost')) {
      // Each distinct IP literal / *.localhost host is treated as its own
      // site - collapsing them would let "attacker.localhost" ride on
      // "victim.localhost"'s trust during local development.
      return `${url.protocol}//${hostname}`;
    }
    const labels = hostname.split('.');
    const registrable = labels.length <= 2 ? hostname : labels.slice(-2).join('.');
    return `${url.protocol}//${registrable}`;
  }

  function isSameSite(pageUrl, destUrl) {
    try {
      return siteFor(pageUrl) === siteFor(destUrl);
    } catch (_) {
      return false;
    }
  }

  // ---------- Event construction ----------

  const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

  function severityFor(fieldType, action) {
    let base;
    switch (fieldType) {
      case 'password':
      case 'credit-card':
      case 'cvv':
      case 'ssn':
        base = 'critical';
        break;
      case 'email':
      case 'phone':
        base = 'medium';
        break;
      default:
        base = 'low';
    }
    // A BLOCKED verdict is a confirmed active cross-site egress attempt,
    // not just a passive observation - floor it at "high".
    if (action === 'BLOCKED' && SEVERITY_RANK[base] < SEVERITY_RANK.high) return 'high';
    return base;
  }

  function safeDestination(url) {
    try {
      const u = new URL(url, location.href);
      return `${u.origin}${u.pathname}`; // strip query/fragment - may carry leaked data
    } catch (_) {
      return 'unknown';
    }
  }

  function emitEvents(matches, { url, method, vector, scriptOrigin, action = 'OBSERVED' }) {
    const destination = safeDestination(url);
    const timestamp = new Date().toISOString();
    for (const m of matches) {
      const event = {
        timestamp,
        website: location.hostname,
        field_type: m.fieldType,
        script_origin: scriptOrigin,
        event_type: action === 'BLOCKED' ? 'network_exfiltration' : 'exfiltration_detected',
        destination,
        vector,
        policy: action === 'BLOCKED' ? 'cross-site-egress-blocked' : 'default',
        action,
        severity: severityFor(m.fieldType, action),
        metadata: {
          field_id: m.fieldId,
          field_hash: m.hash,
          field_length: m.length,
          correlation_timestamp: timestamp,
          request_method: (method || 'GET').toUpperCase()
        }
      };
      window.postMessage({ source: 'unmask-inject', type: 'UNMASK_EVENT', payload: event }, location.origin);
    }
  }

  // ---------- fetch() instrumentation + firewall enforcement ----------
  //
  // This is the P0 enforcement point. The decision is made entirely here, in
  // the page's own MAIN world, before the real fetch ever runs - the backend
  // is never in the loop and is not required for blocking to work.

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async function unmaskFetch(input, init) {
    const scriptOrigin = attributeScript();
    const method =
      (init && init.method) || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET');
    const url = typeof Request !== 'undefined' && input instanceof Request ? input.url : input;

    let matches = [];
    try {
      const bodyText = await extractBodyText(input, init);
      matches = await correlate(bodyText);
    } catch (_) {
      matches = [];
    }

    if (matches.length) {
      let destUrl = null;
      try {
        destUrl = new URL(url, location.href);
      } catch (_) {}

      // Fail closed: an unparseable destination for a request that already
      // matched a sensitive-field fingerprint is treated as untrusted.
      const allowed = destUrl ? isSameSite(new URL(location.href), destUrl) : false;

      if (!allowed) {
        emitEvents(matches, { url, method, vector: 'fetch', scriptOrigin, action: 'BLOCKED' });
        console.warn('UNMASK BLOCKED A SENSITIVE DATA EXFILTRATION ATTEMPT', {
          destination: destUrl ? destUrl.origin : url,
          field_type: matches[0].fieldType
        });
        // The original request is never sent. Reject with the same error
        // shape a real network failure produces - no fabricated response.
        return Promise.reject(Object.assign(new TypeError('Failed to fetch'), { unmaskBlocked: true }));
      }

      emitEvents(matches, { url, method, vector: 'fetch', scriptOrigin, action: 'OBSERVED' });
    }

    return nativeFetch(input, init);
  };

  // ---------- XMLHttpRequest instrumentation ----------

  const nativeXhrOpen = window.XMLHttpRequest.prototype.open;
  const nativeXhrSend = window.XMLHttpRequest.prototype.send;

  window.XMLHttpRequest.prototype.open = function unmaskXhrOpen(method, url, ...rest) {
    this.__unmask = { method, url, scriptOrigin: attributeScript() };
    return nativeXhrOpen.call(this, method, url, ...rest);
  };

  window.XMLHttpRequest.prototype.send = function unmaskXhrSend(body) {
    const info = this.__unmask || {};
    bodyToText(body)
      .then((bodyText) => correlate(bodyText))
      .then((matches) => {
        if (matches.length) {
          emitEvents(matches, { url: info.url, method: info.method, vector: 'xhr', scriptOrigin: info.scriptOrigin });
        }
      })
      .catch(() => {});
    return nativeXhrSend.call(this, body);
  };
})();
