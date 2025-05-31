require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Alexa = require('ask-sdk-core');
const axios = require('axios');
const { toEnglish, toTelugu } = require('./translate');
const { getUsageStats } = require('./usageTracker');

const app = express();
app.use(bodyParser.json());

/**
 * ChatIntent: Translates Telugu → English → ChatGPT → English → Telugu (phonetic)
 */
const ChatIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChatIntent';
  },

  async handle(handlerInput) {
    try {
      const userInput = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question') || 'haayi';

      // Step 1: Telugu → English
      const englishInput = await toEnglish(userInput);

      // Step 2: Send to OpenAI
      const gptResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: englishInput }]
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const englishOutput = gptResponse.data.choices[0].message.content;

      // Step 3: English → Telugu
      const teluguScript = await toTelugu(englishOutput);

      // Step 4: Use phonetic fallback (for now, use Telugu script inside en-IN)
      const phoneticTelugu = teluguScript; // optionally replace with transliteration logic

      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="en-IN">${phoneticTelugu}</lang></speak>`)
        .reprompt("inkaa emina adugutaaru?")
        .withSimpleCard("Chitti", phoneticTelugu)
        .getResponse();

    } catch (err) {
      console.error("❌ ChatIntent Error:", err.message);
      const fallback = "kshaminchandi, edo lopam jarigindi. malli try cheyyandi.";
      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="en-IN">${fallback}</lang></speak>`)
        .reprompt("malli try cheyyandi.")
        .withSimpleCard("Chitti - Lopam", fallback)
        .getResponse();
    }
  }
};

/**
 * LaunchRequest: First time skill is opened
 */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const welcome = "haayi! nenu chitti. meeru em telusukovaalanukuntunnaru?";
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="en-IN">${welcome}</lang></speak>`)
      .reprompt("meeru emi adagavacchu.")
      .withSimpleCard("Chitti", welcome)
      .getResponse();
  }
};

/**
 * ErrorHandler: Handles unhandled exceptions
 */
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("🔥 General Error:", error.message);
    const errorMessage = "kshaminchandi, lopam sambhavinchindi. malli try cheyyandi.";
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="en-IN">${errorMessage}</lang></speak>`)
      .reprompt("malli try cheyyandi.")
      .withSimpleCard("Chitti - Lopam", errorMessage)
      .getResponse();
  }
};

/**
 * Skill Builder
 */
const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ChatIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .create();

/**
 * Alexa POST Endpoint
 */
app.post('/alexa', async (req, res) => {
  const response = await skill.invoke(req.body, req.headers);
  res.json(response);
});

/**
 * Usage Stats Endpoint
 */
app.get('/usage', (req, res) => {
  const stats = getUsageStats();
  res.json({
    used_today: stats.today,
    used_last_7_days: stats.week,
    used_last_30_days: stats.month,
    used_last_365_days: stats.year,
    total_characters: stats.total,
    free_tier_limit: stats.limit
  });
});

/**
 * Root Endpoint
 */
app.get('/', (req, res) => {
  res.send('✅ Chitti Alexa + ChatGPT Telugu Translator is LIVE!');
});

/**
 * Start Server
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chitti backend running on port ${PORT}`));
