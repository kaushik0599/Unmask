// UNMASK Data X-Ray - MV3 service worker.
//
// Final boundary before the network: receives sanitized events from content
// scripts, fills in what only the extension side knows (tab id), and submits
// to the existing backend /events endpoint. Never blocks or breaks the page -
// failures here are swallowed after a small bounded number of attempts.

const BACKEND_URL = 'http://localhost:4000/events';
const REQUEST_TIMEOUT_MS = 3000;
const MAX_ATTEMPTS = 2;

const ALLOWED_FIELD_TYPES = new Set(['password', 'credit-card', 'cvv', 'ssn', 'email', 'phone']);
const ALLOWED_VECTORS = new Set(['fetch', 'xhr']);
const ALLOWED_ACTIONS = new Set(['OBSERVED', 'BLOCKED']);
const ALLOWED_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);
const HASH_RE = /^[a-f0-9]{64}$/;

function isValidPayload(p) {
  return (
    p &&
    typeof p === 'object' &&
    typeof p.timestamp === 'string' &&
    typeof p.website === 'string' &&
    ALLOWED_FIELD_TYPES.has(p.field_type) &&
    typeof p.script_origin === 'string' &&
    typeof p.event_type === 'string' &&
    typeof p.destination === 'string' &&
    ALLOWED_VECTORS.has(p.vector) &&
    ALLOWED_ACTIONS.has(p.action) &&
    ALLOWED_SEVERITIES.has(p.severity) &&
    p.metadata &&
    typeof p.metadata.field_id === 'string' &&
    HASH_RE.test(p.metadata.field_hash || '') &&
    typeof p.metadata.field_length === 'number'
  );
}

async function postWithTimeout(url, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function sendEvent(event, attempt = 1) {
  try {
    const res = await postWithTimeout(BACKEND_URL, event, REQUEST_TIMEOUT_MS);
    if (!res.ok && attempt < MAX_ATTEMPTS) {
      return sendEvent(event, attempt + 1);
    }
    if (!res.ok) {
      console.warn(`[UNMASK] backend rejected event: ${res.status}`);
    }
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      return sendEvent(event, attempt + 1);
    }
    // Backend unavailable - drop the event. Never retries indefinitely and
    // never affects the host page, which has no visibility into this at all.
    console.warn('[UNMASK] backend unavailable, dropping event');
  }
}

// Minimal P0 user-facing signal: a badge on the extension icon for the tab
// where a block happened. No dashboard/popup - just real chrome.action state.
const blockCounts = new Map(); // tabId -> count

function signalBlocked(tabId) {
  if (typeof tabId !== 'number') return;
  const count = (blockCounts.get(tabId) || 0) + 1;
  blockCounts.set(tabId, count);
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#d32f2f' });
  chrome.action.setBadgeText({ tabId, text: String(count) });
  console.warn('UNMASK BLOCKED A SENSITIVE DATA EXFILTRATION ATTEMPT', { tabId, count });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    blockCounts.delete(tabId);
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => blockCounts.delete(tabId));

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== 'UNMASK_EVENT' || !isValidPayload(message.payload)) {
    return false;
  }

  const tabId = sender.tab ? sender.tab.id : undefined;
  const event = {
    ...message.payload,
    tab_id: tabId
  };

  if (event.action === 'BLOCKED') {
    signalBlocked(tabId);
  }

  sendEvent(event);
  return false;
});
