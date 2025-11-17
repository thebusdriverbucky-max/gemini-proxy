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
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${key}`;
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

app.listen(3001, () => console.log('Proxy listening on 3001'));