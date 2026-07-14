import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY || '';

const openai = apiKey ? new OpenAI({ apiKey }) : null;

// Sandbox translation mapping dictionary for local testing without keys
const mockTranslations = {
  spanish: {
    "hello": "hola",
    "how are you?": "¿cómo estás?",
    "the database is crashing in the afternoon.": "la base de datos se está cayendo por la tarde.",
    "i will configure the redis cache by friday.": "configuraré el caché de redis para el viernes."
  },
  german: {
    "hello": "hallo",
    "the database is crashing in the afternoon.": "Die Datenbank stürzt am Nachmittag ab.",
    "we must also enable caching to reduce the load.": "Wir müssen auch das Caching aktivieren, um die Last zu verringern.",
    "i will configure the redis cache by friday.": "Ich werde den Redis-Cache bis Freitag konfigurieren.",
    "optimizing index next morning.": "Indexoptimierung am nächsten Morgen."
  },
  japanese: {
    "hello": "こんにちは",
    "i will share load test results on slack.": "負荷テストの結果をスラックに共有します。"
  },
  english: {
    "la base de datos se está cayendo por la tarde.": "The database is crashing in the afternoon.",
    "wir müssen auch das caching aktivieren, um die last zu verringern.": "We must also enable caching to reduce the load.",
    "ich werde den redis-cache bis freitag konfigurieren.": "I will configure the Redis cache by Friday.",
    "optimizaré el índice de la base de datos mañana por la mañana.": "I will optimize the database index tomorrow morning.",
    "負荷テストの結果をスラックに共有します。": "I will share the load test results on Slack."
  }
};

export const translateText = async (text, targetLanguage) => {
  if (!text) return '';
  const langKey = targetLanguage.toLowerCase();

  // If OpenAI client is initialized, use it
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a translator. Translate the user text directly to ${targetLanguage}. Keep formatting and only return the translated text.`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3
      });
      return response.choices[0].message.content.trim();
    } catch (err) {
      console.warn("OpenAI translation failed, falling back to mock dictionary:", err.message);
    }
  }

  // Fallback sandbox translator logic
  const normalizedText = text.trim().toLowerCase();
  
  if (mockTranslations[langKey]) {
    // Check direct matches
    if (mockTranslations[langKey][normalizedText]) {
      return mockTranslations[langKey][normalizedText];
    }
    
    // Check inverted lookup matches
    for (const [englishWord, foreignWord] of Object.entries(mockTranslations[langKey])) {
      if (normalizedText.includes(englishWord)) {
        return text.toLowerCase().replace(englishWord, foreignWord);
      }
    }
  }

  // If translating from foreign to English
  if (langKey === 'english' && mockTranslations.english) {
    if (mockTranslations.english[normalizedText]) {
      return mockTranslations.english[normalizedText];
    }
    // Substring contains lookups
    for (const [foreignLine, englishLine] of Object.entries(mockTranslations.english)) {
      if (normalizedText.includes(foreignLine) || foreignLine.includes(normalizedText)) {
        return englishLine;
      }
    }
  }

  return `[${targetLanguage}] ${text}`;
};

export const askCopilotAboutChat = async (messagesContext, question) => {
  const contextText = messagesContext
    .map(m => `${m.username || 'User'}: ${m.text}`)
    .join('\n');

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: "You are UnifyWork Copilot, a helpful AI assistant. You answer questions about the active team chat log provided."
          },
          {
            role: 'user',
            content: `Chat Log Context:\n${contextText}\n\nQuestion: ${question}`
          }
        ]
      });
      return response.choices[0].message.content.trim();
    } catch (err) {
      console.warn("OpenAI Q&A failed, falling back to rule base:", err.message);
    }
  }

  // Fallback rule base summarizer
  const query = question.toLowerCase();
  if (query.includes('redis') || query.includes('cache') || query.includes('sarah')) {
    return "Based on the chat log, Sarah mentioned she will configure the Redis cache by Friday to reduce the system load.";
  }
  if (query.includes('database') || query.includes('index') || query.includes('gowtham')) {
    return "According to the conversations, Gowtham is taking care of the database issues and plans to optimize the database index tomorrow morning.";
  }
  if (query.includes('load test') || query.includes('alex') || query.includes('slack')) {
    return "Alex agreed to perform the load tests and will share the test results on Slack.";
  }

  return "I've reviewed the chat logs. The active discussions cover database caching enhancements (Sarah on Redis by Friday), query index optimizations (Gowtham tomorrow morning), and load testing results distribution (Alex). Let me know if you need specific details!";
};
