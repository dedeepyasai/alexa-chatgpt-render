require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Alexa = require('ask-sdk-core');
const axios = require('axios');
const { toEnglish, toTelugu, toPhonetic } = require('./translate');
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

      const englishInput = await toEnglish(userInput);

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

      const teluguScript = await toTelugu(englishOutput);
      const phoneticTelugu = toPhonetic(teluguScript);

      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="en-IN">${phoneticTelugu}</lang></speak>`)
        .reprompt("ఇంకా ఏమైనా అడగాలా?")
        .withSimpleCard("Chitti", teluguScript)
        .getResponse();

    } catch (err) {
      console.error("❌ ChatIntent Error:", err.message);
      const fallback = "క్షమించండి, లోపం జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.";
      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="en-IN">${toPhonetic(fallback)}</lang></speak>`)
        .reprompt("మళ్ళీ ప్రయత్నించండి.")
        .withSimpleCard("Chitti - లోపం", fallback)
        .getResponse();
    }
  }
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const welcomeText = "హాయ్! నేను చిట్టి. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?";
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="en-IN">${toPhonetic(welcomeText)}</lang></speak>`)
      .reprompt("మీరు ఏమి అడగాలనుకుంటున్నారు?")
      .withSimpleCard("Chitti", welcomeText)
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("🔥 General Error:", error.message);
    const errorMessage = "క్షమించండి, లోపం సంభవించింది. మళ్ళీ ప్రయత్నించండి.";
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="en-IN">${toPhonetic(errorMessage)}</lang></speak>`)
      .reprompt("మళ్ళీ ప్రయత్నించండి.")
      .withSimpleCard("Chitti - లోపం", errorMessage)
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

app.post('/alexa', async (req, res) => {
  const response = await skill.invoke(req.body, req.headers);
  res.json(response);
});

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

app.get('/', (req, res) => {
  res.send('✅ Chitti Alexa + ChatGPT Telugu Translator is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
