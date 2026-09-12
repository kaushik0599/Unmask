// UNMASK Data X-Ray - isolated-world content script.
//
// Boundary guard between the page's MAIN-world instrumentation and the
// privileged extension messaging API. Re-validates every field before it is
// allowed through to chrome.runtime.sendMessage - only an explicit allowlist
// of metadata fields is forwarded, so nothing unexpected (or plaintext) can
// leak through even if inject.js were ever compromised or modified.
(() => {
  const ALLOWED_FIELD_TYPES = new Set(['password', 'credit-card', 'cvv', 'ssn', 'email', 'phone']);
  const ALLOWED_VECTORS = new Set(['fetch', 'xhr']);
  const ALLOWED_ACTIONS = new Set(['OBSERVED', 'BLOCKED']);
  const ALLOWED_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
  const HASH_RE = /^[a-f0-9]{64}$/;

  function sanitizeEvent(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const {
      timestamp,
      website,
      field_type: fieldType,
      script_origin: scriptOrigin,
      event_type: eventType,
      destination,
      vector,
      policy,
      action,
      severity,
      metadata
    } = raw;

    if (typeof timestamp !== 'string' || !timestamp) return null;
    if (typeof website !== 'string' || !website) return null;
    if (!ALLOWED_FIELD_TYPES.has(fieldType)) return null;
    if (typeof scriptOrigin !== 'string' || !scriptOrigin) return null;
    if (typeof eventType !== 'string' || !eventType) return null;
    if (typeof destination !== 'string' || !destination) return null;
    if (!ALLOWED_VECTORS.has(vector)) return null;
    if (!ALLOWED_ACTIONS.has(action)) return null;
    if (!ALLOWED_SEVERITIES.has(severity)) return null;
    if (!metadata || typeof metadata !== 'object') return null;
    if (typeof metadata.field_id !== 'string' || !metadata.field_id) return null;
    if (typeof metadata.field_hash !== 'string' || !HASH_RE.test(metadata.field_hash)) return null;
    if (typeof metadata.field_length !== 'number' || metadata.field_length < 0) return null;

    // Explicit allowlist reconstruction - nothing beyond these fields passes.
    return {
      timestamp,
      website,
      field_type: fieldType,
      script_origin: scriptOrigin,
      event_type: eventType,
      destination,
      vector,
      policy: typeof policy === 'string' && policy ? policy : 'default',
      action,
      severity,
      metadata: {
        field_id: metadata.field_id,
        field_hash: metadata.field_hash,
        field_length: metadata.field_length,
        correlation_timestamp:
          typeof metadata.correlation_timestamp === 'string' ? metadata.correlation_timestamp : timestamp,
        request_method: typeof metadata.request_method === 'string' ? metadata.request_method : 'GET'
      }
    };
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return; // only accept messages from this same page's MAIN world
    const data = event.data;
    if (!data || data.source !== 'unmask-inject' || data.type !== 'UNMASK_EVENT') return;

    const sanitized = sanitizeEvent(data.payload);
    if (!sanitized) return;

    if (sanitized.action === 'BLOCKED') {
      console.warn('UNMASK BLOCKED A SENSITIVE DATA EXFILTRATION ATTEMPT', {
        website: sanitized.website,
        destination: sanitized.destination,
        field_type: sanitized.field_type
      });
    }

    try {
      chrome.runtime.sendMessage({ type: 'UNMASK_EVENT', payload: sanitized }).catch(() => {});
    } catch (_) {
      // Extension context can be invalidated (e.g. reload) - fail silently,
      // never disrupt the host page.
    }
  });
})();
