import OpenAI from 'openai';
import { config } from '../config.js';

// Pre-cached translations for the multi-lingual simulation script
const PRE_CACHED_TRANSLATIONS = {
  // Spanish speech line -> Target English
  "la base de datos se está cayendo por la tarde.": {
    "english": "The database is crashing in the afternoon.",
    "french": "La base de données s'effondre l'après-midi.",
    "german": "Die Datenbank stürzt am Nachmittag ab.",
    "japanese": "データベースが午後にクラッシュしています。"
  },
  "optimizaré el índice de la base de datos mañana por la mañana.": {
    "english": "I will optimize the database index tomorrow morning.",
    "french": "J'optimiserai l'index de la base de données demain matin.",
    "german": "Ich werde den Datenbankindex morgen früh optimieren.",
    "japanese": "明日朝、データベースのインデックスを最適化します。"
  },
  // German speech line -> Target English
  "wir müssen auch das caching aktivieren, um die last zu verringern.": {
    "english": "We must also enable caching to reduce the load.",
    "french": "Nous devons également activer la mise en cache pour réduire la charge.",
    "german": "Wir müssen auch das Caching aktivieren, um die Last zu verringern.",
    "japanese": "負荷を軽減するために、キャッシングも有効にする必要があります。"
  },
  "ich werde den redis-cache bis freitag konfigurieren.": {
    "english": "I will configure the Redis cache by Friday.",
    "french": "Je vais configurer le cache Redis d'ici vendredi.",
    "german": "Ich werde den Redis-Cache bis Freitag konfigurieren.",
    "japanese": "金曜日までにRedisキャッシュを構成します。"
  },
  // Japanese speech line -> Target English
  "負荷テストの結果をスラックに共有します。": {
    "english": "I will share the load testing results on Slack.",
    "french": "Je partagerai les résultats des tests de charge sur Slack.",
    "german": "Ich werde die Ergebnisse des Auslastungstests auf Slack teilen.",
    "japanese": "負荷テストの結果をスラックに共有します。"
  }
};

async function translateLive(text, targetLanguage) {
  if (!config.openaiApiKey) {
    throw new Error("OpenAI API Key not configured.");
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: config.openaiApiBase
  });

  const prompt = `You are a professional real-time speech translator.
Your task is to detect the source language of the input text and translate it into: "${targetLanguage}".
Return ONLY the final translated text. Do not add any introductory phrases, explanations, quotes, or punctuation modifications.

Input Text:
${text}`;

  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: "system", content: "You are a precise translator. Output ONLY the translated text and nothing else." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1
  });

  return response.choices[0].message.content.trim();
}

function translateMock(text, targetLanguage) {
  const normalizedText = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  const targetKey = targetLanguage.trim().toLowerCase();

  // 1. Look up in cached multi-lingual script entries
  for (const [sourcePhrase, targets] of Object.entries(PRE_CACHED_TRANSLATIONS)) {
    if (sourcePhrase.toLowerCase().includes(normalizedText) || normalizedText.includes(sourcePhrase.toLowerCase())) {
      if (targets[targetKey]) {
        return targets[targetKey];
      }
    }
  }

  // 2. Default sandbox translator mock fallback
  // If translating from English/mock to something else, or if translation is missing
  if (targetKey === 'english') {
    if (text.includes("cayendo")) return "The database is crashing in the afternoon.";
    if (text.includes("optimizaré")) return "I will optimize the database index tomorrow morning.";
    if (text.includes("caching")) return "We must also enable caching to reduce the load.";
    if (text.includes("redis-cache")) return "I will configure the Redis cache by Friday.";
    if (text.includes("負荷テスト")) return "I will share the load testing results on Slack.";
    return text; // Already English or fallback
  }

  // Basic mock indicators for non-english targets
  const indicators = {
    spanish: " [Traducido al Español]",
    french: " [Traduit en Français]",
    german: " [Ins Deutsche übersetzt]",
    japanese: " [日本語に翻訳]"
  };

  const suffix = indicators[targetKey] || ` [Translated to ${targetLanguage}]`;
  return `${text}${suffix}`;
}

export async function translateText(text, targetLanguage) {
  if (config.useMockApis) {
    return translateMock(text, targetLanguage);
  } else {
    try {
      return await translateLive(text, targetLanguage);
    } catch (e) {
      console.warn("Live translation failed, using mock:", e.message);
      return translateMock(text, targetLanguage);
    }
  }
}
