const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const sanitizeHTML = require('../utils/sanitize');

const MAX_FETCH_TIMEOUT = parseInt(process.env.MAX_FETCH_TIMEOUT, 10) || 10000;
const MAX_RESPONSE_SIZE = parseInt(process.env.MAX_RESPONSE_SIZE, 10) || 5242880;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
};

// Heuristics to detect paywalled / truncated content
const PAYWALL_SELECTORS = [
  '[class*="paywall"]',
  '[id*="paywall"]',
  '[class*="subscribe-wall"]',
  '[class*="meter-"]',
  '[class*="piano-"]',
  '[id*="piano"]',
  '[class*="regwall"]',
  '[class*="gateway"]',
  '[data-paywall]',
];

const PAYWALL_KEYWORDS = [
  'subscribe to continue reading',
  'subscribe to read',
  'to continue reading',
  'create a free account',
  'sign in to read',
  'log in to continue',
  'already a subscriber',
  'this article is for subscribers',
  'members only',
  'premium content',
  'exclusive to subscribers',
  'you\'ve reached your limit',
  'free articles remaining',
  'unlock this article',
];

function detectPaywall(document, html, textContent) {
  const signals = [];

  // Check for paywall-related DOM elements
  for (const selector of PAYWALL_SELECTORS) {
    try {
      if (document.querySelector(selector)) {
        signals.push('paywall-element');
        break;
      }
    } catch { /* ignore invalid selectors */ }
  }

  // Check for paywall keywords in the raw HTML
  const lowerHtml = html.toLowerCase();
  for (const keyword of PAYWALL_KEYWORDS) {
    if (lowerHtml.includes(keyword)) {
      signals.push('paywall-keyword');
      break;
    }
  }

  // Check for suspiciously short extracted content (< 500 chars)
  // when the page itself is large — suggests truncation
  if (textContent && textContent.length < 500 && html.length > 20000) {
    signals.push('truncated');
  }

  // Check for metered paywall meta tags
  const metaElements = document.querySelectorAll('meta');
  for (const meta of metaElements) {
    const name = (meta.getAttribute('name') || '').toLowerCase();
    const content = (meta.getAttribute('content') || '').toLowerCase();
    if (
      name.includes('paywall') ||
      content.includes('metered') ||
      content.includes('locked') ||
      content.includes('paywall')
    ) {
      signals.push('paywall-meta');
      break;
    }
  }

  return {
    detected: signals.length > 0,
    signals,
  };
}

async function extractArticle(url) {
  // Fetch the HTML
  let response;
  try {
    response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: MAX_FETCH_TIMEOUT,
      maxRedirects: 5,
      maxContentLength: MAX_RESPONSE_SIZE,
      responseType: 'text',
    });
  } catch (err) {
    const status = err.response?.status;
    throw {
      statusCode: 502,
      message: `Could not fetch the provided URL.${status ? ` (HTTP ${status})` : ''} The site may be blocking automated requests.`,
    };
  }

  // Validate content type
  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw {
      statusCode: 422,
      message: 'The URL did not return an HTML page.',
    };
  }

  const html = response.data;

  // Parse with JSDOM
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // Run Readability
  const reader = new Readability(document);
  const article = reader.parse();

  if (!article || !article.content || article.content.trim().length === 0) {
    throw {
      statusCode: 422,
      message: 'No readable article content found on that page.',
    };
  }

  // Detect paywall signals
  const paywall = detectPaywall(document, html, article.textContent);

  // Sanitize the HTML content
  const sanitizedContent = sanitizeHTML(article.content);

  return {
    title: article.title || 'Untitled',
    byline: article.byline || null,
    content: sanitizedContent,
    textContent: article.textContent || '',
    excerpt: article.excerpt || '',
    siteName: article.siteName || new URL(url).hostname,
    length: article.length || article.textContent?.length || 0,
    sourceUrl: url,
    paywall: paywall.detected ? {
      detected: true,
      message: 'This article appears to be behind a paywall. The content below may be incomplete.',
    } : null,
  };
}

module.exports = extractArticle;
