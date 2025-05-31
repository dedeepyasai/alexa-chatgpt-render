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
      console.log("🗣️ User input:", userInput);

      const englishInput = await toEnglish(userInput);
      console.log("🌐 Translated to English:", englishInput);

      const gptResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: englishInput }]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const englishOutput = gptResponse.data.choices[0].message.content;
      console.log("🧠 GPT Output:", englishOutput);

      const teluguOutput = await toTelugu(englishOutput);
      console.log("🌐 Telugu Translation:", teluguOutput);

      const phoneticOutput = toPhonetic(teluguOutput);
      console.log("🔊 Alexa will speak:", phoneticOutput);

      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang='en-IN'>${phoneticOutput}</lang></speak>`)
        .reprompt('<speak>inkaa emina adagavacchaa?</speak>')
        .withSimpleCard("Chitti Bot", teluguOutput)
        .getResponse();
    } catch (err) {
      console.error("🔥 General Error:", err);
      return handlerInput.responseBuilder
        .speak("<speak><lang xml:lang='en-IN'>kshamimchamdi, edo tappu jarigindi.</lang></speak>")
        .getResponse();
    }
  }
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const welcome = "hAy! nenu chiTTi. mIru emi ta\u1ccdlusukovAlanukuMTunnAru?";
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang='en-IN'>${welcome}</lang></speak>`)
      .reprompt('inka emina adagavacchaa?')
      .withSimpleCard("Chitti Bot", "హాయ్! నేను చిట్టి. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?")
      .getResponse();
  }
};

const FallbackHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
           Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    console.warn("⚠️ Alexa triggered FallbackIntent — no intent matched.");
    console.log("🔴 Unmatched Request:", JSON.stringify(handlerInput.requestEnvelope, null, 2));
    return handlerInput.responseBuilder
      .speak("<speak><lang xml:lang='en-IN'>kshamimchamdi, nenu a abhyarthananu artham chesukolenu. malli prayatnimchamdi.</lang></speak>")
      .reprompt('<speak>dayachesi maro prashna adagandi.</speak>')
      .withSimpleCard("Chitti Bot", "క్షమించండి, నేను ఆ అభ్యర్థనను అర్థం చేసుకోలేను. మళ్ళీ ప్రయత్నించండి.")
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`🔚 Session ended: ${JSON.stringify(handlerInput.requestEnvelope.request.reason)}`);
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("❌ Global Error:", error);
    return handlerInput.responseBuilder
      .speak("<speak><lang xml:lang='en-IN'>kshamimchamdi, tappu jarigindi.</lang></speak>")
      .getResponse();
  }
};

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ChatIntentHandler,
    FallbackHandler,
    SessionEndedRequestHandler
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
  res.send('Chitti Alexa Skill backend is running!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chitti backend running on port ${PORT}`));
