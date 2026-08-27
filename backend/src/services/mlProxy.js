const DEFAULT_TIMEOUT_MS = 120000;

class MlServiceError extends Error {
  constructor(message, status = 502, details = {}) {
    super(message);
    this.name = 'MlServiceError';
    this.status = status;
    this.details = details;
  }
}

const baseUrl = () => (process.env.PY_ML_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function request(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${baseUrl()}${path}`;
    const upstream = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const text = await upstream.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { detail: text };
    }
    if (!upstream.ok) {
      throw new MlServiceError(
        body.detail || body.message || `ML service returned HTTP ${upstream.status}`,
        upstream.status,
        body
      );
    }
    return body;
  } catch (error) {
    if (error instanceof MlServiceError) throw error;
    throw new MlServiceError(
      error.name === 'AbortError' ? 'ML service request timed out.' : `ML service unavailable: ${error.message}`,
      502,
      { upstream: baseUrl(), path }
    );
  } finally {
    clearTimeout(timer);
  }
}

function resolvePathWithParams(templatePath, params = {}) {
  let resolved = templatePath;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`:${key}`, encodeURIComponent(value));
  }
  return resolved;
}

function appendQuery(path, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path;
}

async function get(path, query = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const fullPath = appendQuery(path, query);
  return request(fullPath, { method: 'GET' }, timeoutMs);
}

async function post(path, payload, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return request(path, { method: 'POST', body: JSON.stringify(payload || {}) }, timeoutMs);
}

const proxyGet = (templatePath) => async (req, res, next) => {
  try {
    const targetPath = resolvePathWithParams(templatePath || req.path, req.params);
    res.json(await get(targetPath, req.query));
  } catch (error) {
    next(error);
  }
};

const proxyPost = (templatePath) => async (req, res, next) => {
  try {
    const targetPath = resolvePathWithParams(templatePath || req.path, req.params);
    res.json(await post(targetPath, req.body));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  MlServiceError,
  get,
  post,
  proxyGet,
  proxyPost,
  getHealth: () => get('/health', {}, 5000),
};
