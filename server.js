const express = require('express');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());


app.post('/gemini', async (req, res) => {
  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;


  if (!apiKey) {
    return res.status(400).json({ error: 'API key not configured' });
  }


  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;


  console.log('Sending request to:', url); // ЛОГИРОВАНИЕ


  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });


    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return res.status(500).json({ error: errorData });
    }


    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Server Error:', error);
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
