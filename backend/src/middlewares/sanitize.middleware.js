import xss from 'xss';

const XSS_OPTIONS = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script']
};

// Las contraseñas nunca se renderizan como HTML y pueden contener símbolos como < o >; se omiten antes del hash
const SKIP_KEYS = new Set(['password', 'password_actual', 'password_nueva']);

function sanitizeValue(value, key = '') {
  if (SKIP_KEYS.has(key)) return value;
  if (typeof value === 'string') return xss(value.trim(), XSS_OPTIONS);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (value !== null && typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      clean[k] = sanitizeValue(v, k);
    }
    return clean;
  }
  return value;
}

export function sanitizeInput(req, _res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}