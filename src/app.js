const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const SERVICES = {
  '/api/products':     process.env.PRODUCT_CATALOG_URL  || 'http://localhost:3001',
  '/api/cart':         process.env.CART_SERVICE_URL     || 'http://localhost:3002',
  '/api/orders':       process.env.ORDER_SERVICE_URL    || 'http://localhost:3003',
  '/api/payments':     process.env.PAYMENT_SERVICE_URL  || 'http://localhost:3004',
  '/api/shipping':     process.env.SHIPPING_SERVICE_URL || 'http://localhost:3005',
  '/invoices':         process.env.INVOICE_SERVICE_URL  || 'http://localhost:3006',
  '/api/users/auth':   process.env.USER_SERVICE_URL     || 'http://localhost:3007',
  '/api/users':        process.env.USER_SERVICE_URL     || 'http://localhost:3007',
  '/api/notifications': process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
};

const PROTECTED_ROUTES = ['/api/users'];

function requestId(req, res, next) {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

function authMiddleware(req, res, next) {
  const matched = PROTECTED_ROUTES.find(p => req.path.startsWith(p));
  if (!matched && !req.path.startsWith('/api/users/auth')) {
    return next();
  }

  if (req.path.startsWith('/api/users/auth')) return next();

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header', details: {} },
      meta: { requestId: req.requestId },
    });
  }

  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    req.headers['x-user-id'] = decoded.sub || decoded.userId;
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json({
      data: null,
      error: { code, message: err.message, details: {} },
      meta: { requestId: req.requestId },
    });
  }
}

function proxyMiddleware(target, prefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => path,
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('X-Request-ID', req.requestId);
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('X-User-Id', req.headers['x-user-id']);
        }
      },
      error: (err, req, res) => {
        res.status(502).json({
          data: null,
          error: { code: 'SERVICE_UNAVAILABLE', message: `Service at ${target} is unavailable`, details: {} },
          meta: { requestId: req.requestId },
        });
      },
    },
  });
}

app.use(express.json());
app.use(requestId);
app.use(authMiddleware);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', uptime: Math.floor(process.uptime()) });
});

Object.entries(SERVICES).forEach(([prefix, target]) => {
  app.use(prefix, proxyMiddleware(target, prefix));
});

app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { code: 'NOT_FOUND', message: 'Route not found', details: {} },
    meta: { requestId: _req.requestId },
  });
});

module.exports = app;
