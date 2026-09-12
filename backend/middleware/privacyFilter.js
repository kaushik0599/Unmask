// Rejects any payload that appears to carry plaintext sensitive data.
// IMPORTANT: never log rejected request bodies or values.

const RESTRICTED_TERMS = [
  'password',
  'card number',
  'cardnumber',
  'card_number',
  'cvv',
  'cookie',
  'token',
  'api key',
  'api_key',
  'apikey',
  'access token',
  'access_token',
  'refresh token',
  'refresh_token',
  'authorization',
  'secret'
];

// Structural classification fields are allowed to legitimately hold values
// like "password" (e.g. field_type describing what kind of field was
// targeted) without that being an actual secret leak.
const EXEMPT_KEYS = new Set(['field_type', 'event_type']);

function containsRestrictedTerm(value) {
  const lower = String(value).toLowerCase();
  return RESTRICTED_TERMS.some((term) => lower.includes(term));
}

function scanForViolation(value, parentKey) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    if (EXEMPT_KEYS.has(parentKey)) {
      return false;
    }
    return containsRestrictedTerm(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => scanForViolation(item, parentKey));
  }

  if (typeof value === 'object') {
    return Object.entries(value).some(([key, val]) => {
      if (containsRestrictedTerm(key)) {
        return true;
      }
      return scanForViolation(val, key);
    });
  }

  return false;
}

function privacyFilter(req, res, next) {
  if (scanForViolation(req.body, null)) {
    return res.status(400).json({
      error: 'PRIVACY_VIOLATION',
      message: 'Payload appears to contain restricted sensitive data.'
    });
  }
  next();
}

module.exports = { privacyFilter, scanForViolation, containsRestrictedTerm, RESTRICTED_TERMS };
