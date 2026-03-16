const DOMPurify = require('isomorphic-dompurify');

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'strong', 'em', 'b', 'i',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'img', 'figure', 'figcaption',
  'br', 'hr', 'div', 'span',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel'];

function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

module.exports = sanitizeHTML;
