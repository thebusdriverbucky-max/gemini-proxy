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
      
      // Восстанавливаем ключ через 5 минут после ошибки
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
        
        // Если quota exceeded, пробуем следующий ключ
        if (error
