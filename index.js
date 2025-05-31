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
 * ChatIntent: Translates Telugu to English → Gets ChatGPT reply → Translates back to Telugu
 */
const ChatIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChatIntent';
  },

  async handle(handlerInput) {
    try {
      const userInput = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question') || 'హలో';

      // Step 1: Telugu → English
      const englishInput = await toEnglish(userInput);

      // Step 2: Ask ChatGPT
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
      const teluguOutput = await toTelugu(englishOutput);

      // Step 4: Speak and show result
      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="te-IN">${teluguOutput}</lang></speak>`)
        .reprompt("ఇంకా ఏమైనా అడగాలా?")
        .withSimpleCard("Chitti", teluguOutput)
        .getResponse();

    } catch (err) {
      console.error("❌ ChatIntent Error:", err.message);
      const errorMsg = "క్షమించండి, ఏదో లోపం సంభవించింది. దయచేసి మళ్లీ ప్రయత్నించండి.";
      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="te-IN">${errorMsg}</lang></speak>`)
        .reprompt("మరొక ప్రశ్న అడగాలా?")
        .withSimpleCard("Chitti - లోపం", errorMsg)
        .getResponse();
    }
  }
};

/**
 * LaunchRequest: First time the skill is opened
 */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const message = "హాయ్! నేను చిట్టి. మీరు ఏం తెలుసుకోవాలనుకుంటున్నారు?";
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="te-IN">${message}</lang></speak>`)
      .reprompt("మీరు ఏదైనా అడగవచ్చును.")
      .withSimpleCard("Chitti", message)
      .getResponse();
  }
};

/**
 * ErrorHandler: Catches any unhandled errors
 */
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("🔥 General Error:", error.message);
    const teluguError = "క్షమించండి, లోపం సంభవించింది. దయచేసి మళ్లీ ప్రయత్నించండి.";
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="te-IN">${teluguError}</lang></speak>`)
      .reprompt("మరొక ప్రశ్న అడగాలా?")
      .withSimpleCard("Chitti - లోపం", teluguError)
      .getResponse();
  }
};

/**
 * Skill Initialization
 */
const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ChatIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .create();

/**
 * Alexa POST endpoint
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
 * Root Route for Health Check
 */
app.get('/', (req, res) => {
  res.send('✅ Chitti Alexa + ChatGPT Telugu Translator is live!');
});

/**
 * Start Express Server
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chitti backend running on port ${PORT}`));
