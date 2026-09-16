// Request + Response adapters: give handlers a tiny, isomorphic interface that
// both the Node HTTP server and the Cloudflare Worker implement.

export function createResponse(res = {}) {
  return {
    _status: 200,
    _headers: { 'Content-Type': 'application/json; charset=utf-8' },
    _body: '',
    _sent: false,
    status(code) {
      this._status = code;
      return this;
    },
    setHeader(name, value) {
      this._headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader(name) {
      return this._headers[name.toLowerCase()];
    },
    send(body) {
      this._body = typeof body === 'string' ? body : JSON.stringify(body);
      this._sent = true;
      return this;
    },
    json(body) {
      this._body = JSON.stringify(body);
      this._sent = true;
      return this;
    },
  };
}

export function createNodeRequest(req, bodyText) {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const queryObj = {};
  parsed.searchParams.forEach((v, k) => (queryObj[k] = v));
  return {
    method: req.method,
    url: req.url,
    text: bodyText || '',
    headers: req.headers,
    query: queryObj,
    getHeader(name) {
      const h = (req.headers[name] || req.headers[name.toLowerCase()] || '');
      return Array.isArray(h) ? h.join(', ') : h;
    },
  };
}

export function createWorkerRequest(request) {
  const parsed = new URL(request.url);
  const queryObj = {};
  parsed.searchParams.forEach((v, k) => (queryObj[k] = v));
  return {
    method: request.method,
    url: request.url,
    text: null, // lazily read below
    _request: request,
    query: queryObj,
    getHeader(name) {
      return request.headers.get(name) || '';
    },
  };
}
