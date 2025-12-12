const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const mainModel = 'qwen/qwen3-32b';
const fallbackModel = 'llama-3.3-70b-versatile';

async function getGroqChatCompletion(prompt, model) {
    return groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: model
    });
}

app.post('/gemini', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const chatCompletion = await getGroqChatCompletion(prompt, mainModel);
        res.json(chatCompletion);
    } catch (error) {
        if (error.status === 429) {
            console.warn(`Rate limit exceeded for ${mainModel}. Switching to fallback model ${fallbackModel}.`);
            try {
                const chatCompletion = await getGroqChatCompletion(prompt, fallbackModel);
                res.json(chatCompletion);
            } catch (fallbackError) {
                console.error('Fallback model error:', fallbackError);
                res.status(500).json({ error: fallbackError.message });
            }
        } else {
            console.error('Groq API error:', error);
            res.status(500).json({ error: error.message });
        }
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
