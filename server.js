const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Массив с несколькими ключами
const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2
].filter(Boolean);

// Менеджер ключей с автоматической ротацией
class KeyManager {
  constructor(keys) {
    this.keys = keys.map(key => ({
      key,
      failures: 0,
      lastFailure: null,
      disabled: false
    }));
    this.currentIndex = 0;
  }

  getNextKey() {
    let attempts = 0;
    while (attempts < this.keys.length) {
      const keyData = this.keys[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      
      if (keyData.disabled && Date.now() - keyData.lastFailure > 300000) {
        keyData.disabled = false;
        keyData.failures = 0;
      }
      
      if (!keyData.disabled) {
        return keyData;
      }
      
      attempts++;
    }
    
    return this.keys[0];
  }

  reportFailure(key) {
    const keyData = this.keys.find(k => k.key === key);
    if (keyData) {
      keyData.failures++;
      keyData.lastFailure = Date.now();
      
      if (keyData.failures >= 3) {
        keyData.disabled = true;
        console.log(`❌ Key disabled: ${key.substring(0, 15)}...`);
      }
    }
  }

  reportSuccess(key) {
    const keyData = this.keys.find(k => k.key === key);
    if (keyData) {
      keyData.failures = 0;
    }
  }
}

const keyManager = new KeyManager(API_KEYS);

// Функция для запросов с автоматической ротацией ключей
async function fetchGeminiWithRetry(prompt) {
  let lastError;
  
  for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
    const keyData = keyManager.getNextKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyData.key}`;
    
    console.log(`🔑 Trying key: ${keyData.key.substring(0, 15)}... (attempt ${attempt + 1}/${API_KEYS.length})`);
    
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
        
        if (errorData.error?.message?.includes('quota') || 
            errorData.error?.message?.includes('limit')) {
          keyManager.reportFailure(keyData.key);
          lastError = new Error('Rate limit exceeded');
          continue;
        }
        
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();
      keyManager.reportSuccess(keyData.key);
      console.log('✅ Request successful');
      return data;
      
    } catch (error) {
      console.error(`Error with key ${keyData.key.substring(0, 15)}...:`, error.message);
      keyManager.reportFailure(keyData.key);
      lastError = error;
    }
  }
  
  throw new Error(`All API keys exhausted. Last error: ${lastError?.message}`);
}

// Существующий эндпоинт для Таро
app.post('/gemini', async (req, res) => {
  const { prompt } = req.body;

  if (API_KEYS.length === 0) {
    return res.status(400).json({ error: 'No API keys configured' });
  }

  try {
    const data = await fetchGeminiWithRetry(prompt);
    res.json(data);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// НОВЫЙ эндпоинт для Матрицы Судьбы
app.post('/api/matrix/interpret', async (req, res) => {
  const { matrixData, userData, arcanaDescriptions } = req.body;

  if (API_KEYS.length === 0) {
    return res.status(400).json({ error: 'No API keys configured' });
  }

  const systemContext = `Ты эксперт по Матрице Судьбы и нумерологии. Дай понятную, практичную расшифровку без сложных терминов.`;

  const userPrompt = `
Дата рождения: ${userData.birthDate}
Текущий возраст: ${userData.currentAge}
Возрастной период: ${userData.ageRange}

Рассчитанные арканы:
- Центральный аркан: ${matrixData.center} ${arcanaDescriptions[matrixData.center] ? `(${arcanaDescriptions[matrixData.center].name})` : ''}
- Личная цель: ${matrixData.personalGoal} ${arcanaDescriptions[matrixData.personalGoal] ? `(${arcanaDescriptions[matrixData.personalGoal].name})` : ''}
- Социальная цель: ${matrixData.socialGoal} ${arcanaDescriptions[matrixData.socialGoal] ? `(${arcanaDescriptions[matrixData.socialGoal].name})` : ''}

Создай расшифровку в формате:
1. Текущий жизненный период (2-3 предложения)
2. Основные задачи этого возраста (3-5 пунктов)
3. Практические рекомендации
  `;

  const fullPrompt = `${systemContext}\n\n${userPrompt}`;

  try {
    const data = await fetchGeminiWithRetry(fullPrompt);
    const interpretation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Не удалось получить расшифровку';
    res.json({ interpretation });
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Эндпоинт для проверки статуса ключей
app.get('/api/status', (req, res) => {
  res.json({
    totalKeys: keyManager.keys.length,
    activeKeys: keyManager.keys.filter(k => !k.disabled).length,
    keys: keyManager.keys.map(k => ({
      preview: k.key.substring(0, 15) + '...',
      disabled: k.disabled,
      failures: k.failures,
      lastFailure: k.lastFailure ? new Date(k.lastFailure).toISOString() : null
    }))
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`🔑 Active API keys: ${API_KEYS.length}`);
});
