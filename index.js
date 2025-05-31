require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Alexa = require('ask-sdk-core');
const axios = require('axios');
const { toEnglish, toTelugu } = require('./translate');
const { getUsageStats } = require('./usageTracker');

const app = express();
app.use(bodyParser.json());

const ChatIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChatIntent';
  },

  async handle(handlerInput) {
    try {
      const userInput = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question') || 'హలో';

      // Step 1: Translate Telugu → English
      const englishInput = await toEnglish(userInput);

      // Step 2: Get response from ChatGPT
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

      // Step 3: Translate English → Telugu
      const teluguOutput = await toTelugu(englishOutput);

      return handlerInput.responseBuilder
        .speak(teluguOutput)
        .reprompt("ఇంకా ఏమైనా అడగాలా?")
        .getResponse();
    } catch (err) {
      console.error("❌ ERROR:", err.message);
      return handlerInput.responseBuilder
        .speak("క్షమించండి, ఏదో లోపం జరిగింది.")
        .getResponse();
    }
  }
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("హాయ్! మీరు ఏదైనా అడగవచ్చును.")
      .reprompt("మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?")
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("General Error:", error.message);
    return handlerInput.responseBuilder
      .speak("క్షమించండి, లోపం సంభవించింది.")
      .getResponse();
  }
};

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ChatIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .create();

// Alexa Skill endpoint
app.post('/alexa', async (req, res) => {
  const response = await skill.invoke(req.body, req.headers);
  res.json(response);
});

// Usage endpoint
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

// Root check
app.get('/', (req, res) => {
  res.send('Alexa ChatGPT with Telugu Translation is running!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
