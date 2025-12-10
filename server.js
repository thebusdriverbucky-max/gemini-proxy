const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("API key not configured. Please set GEMINI_API_KEY in your .env file");
  process.exit(1); // Выход, если ключ не настроен
}
// Инициализируем SDK сразу с нужной версией API
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/gemini', async (req, res) => {
try {
    const result = await genAI.listModels();
    res.json(result.models);
} catch (error) {
console.error('Gemini API Error:', error);
res.status(500).json({ error: error.message });
}
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy on port ${PORT}`));
app.post('/api/astro/chart', async (req, res) => {
  const { date, location } = req.body;
  
  try {
    const response = await fetch(`https://${process.env.ASTRO_HOST}/api/v3/natal-wheel-chart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.ASTRO_API_KEY,
        'X-RapidAPI-Host': process.env.ASTRO_HOST
      },
      body: JSON.stringify({ date, location })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Эндпоинт для timezone (если используется)
app.post('/api/timezone', async (req, res) => {
  const { lat, lng } = req.body;
  
  try {
    const response = await fetch(
      `https://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.TZDB_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`
    );
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
