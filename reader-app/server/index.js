const express = require('express');
const cors = require('cors');
const path = require('path');
const extractRoute = require('./routes/extract');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from React build in production
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// API routes
app.use('/api', extractRoute);

// Fallback to React app for non-API routes in production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Reader server running on http://localhost:${PORT}`);
});
