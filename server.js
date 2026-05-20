const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for single page application styling
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Proxy endpoint for Gemini API (delegates to the Vercel-compatible serverless api route)
const chatHandler = require('./api/chat.js');
app.post('/api/chat', chatHandler);

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Leo & Lia chat website running on port ${PORT}`);
  console.log(` Access locally at: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
