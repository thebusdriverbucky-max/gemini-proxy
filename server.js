const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/gemini', async (req, res) => {
  const { prompt } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      candidates: [{
        content: {
          parts: [{
            text: text
          }]
        }
      }]
    });
  } catch (e) {
    res.status(500).json({ error: e.message, detail: e?.response?.data });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Proxy listening on ${port}`));