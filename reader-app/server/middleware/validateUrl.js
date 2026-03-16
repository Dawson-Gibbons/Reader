const net = require('net');
const dns = require('dns');
const { URL } = require('url');

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
  /^::1$/,
  /^::$/,
];

function isPrivateIP(ip) {
  return PRIVATE_RANGES.some((range) => range.test(ip));
}

function validateUrl(req, res, next) {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL provided.',
    });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL provided.',
    });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL provided.',
    });
  }

  const hostname = parsed.hostname;

  // Block IP-based URLs that are private
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL provided.',
      });
    }
    return next();
  }

  // Block localhost variations
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL provided.',
    });
  }

  // DNS resolution check for SSRF prevention
  dns.lookup(hostname, (err, address) => {
    if (err) {
      return next(); // Let the fetch fail naturally
    }
    if (isPrivateIP(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL provided.',
      });
    }
    next();
  });
}

module.exports = validateUrl;
