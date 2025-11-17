const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/gemini', async (req, res) => {
  const { prompt } = req.body;
  const key = process.env.GEMINI_API_KEY;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  try {
    const response = await axios.post(endpoint, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message, detail: e?.response?.data });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Proxy listening on ${port}`));