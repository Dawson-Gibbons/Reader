const express = require('express');
const router = express.Router();
const extractArticle = require('../services/articleExtractor');
const validateUrl = require('../middleware/validateUrl');
const rateLimiter = require('../middleware/rateLimiter');

router.post('/extract', rateLimiter, validateUrl, async (req, res) => {
  try {
    const { url } = req.body;
    const data = await extractArticle(url);

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message =
      err.message || 'An unexpected error occurred while extracting the article.';

    return res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
});

module.exports = router;
