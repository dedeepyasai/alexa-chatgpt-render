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

      // 🛑 Filter common invocation phrases or junk
      const blockedPhrases = [
        'open chitti',
        'open chitti bot',
        'start chitti',
        'launch chitti',
        'launch chitti bot',
        'chitti',
        'chitti bot',
      ];
      const cleanedInput = userInput.toLowerCase().trim();
      if (blockedPhrases.includes(cleanedInput)) {
        const filteredMsg = "దయచేసి మీరు అడగాలనుకున్న ప్రశ్నను చెప్పండి.";
        const filteredPhonetic = toPhonetic(filteredMsg);
        return handlerInput.responseBuilder
          .speak(`<speak><lang xml:lang="en-IN">${filteredPhonetic}</lang></speak>`)
          .reprompt("మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?")
          .withSimpleCard("Chitti Bot", filteredMsg)
          .getResponse();
      }

      const englishInput = await toEnglish(userInput);
      console.log("🌐 Translated to English:", englishInput);

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
      console.log("🧠 GPT Output:", englishOutput);

      const teluguScript = await toTelugu(englishOutput);
      console.log("🌐 Telugu Translation:", teluguScript);

      const phoneticTelugu = toPhonetic(teluguScript);
      console.log("🗣️ Alexa will speak:", phoneticTelugu);

      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="en-IN">${phoneticTelugu}</lang></speak>`)
        .reprompt("inkaa emina adagavacchaa?")
        .withSimpleCard("Chitti Bot", teluguScript)
        .getResponse();

    } catch (err) {
      console.error("❌ ChatIntentHandler Error:", err.message);
      const fallback = "క్షమించండి, లోపం సంభవించింది. మళ్ళీ ప్రయత్నించండి.";
      const phoneticFallback = toPhonetic(fallback);
      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="en-IN">${phoneticFallback}</lang></speak>`)
        .reprompt("దయచేసి మళ్ళీ ప్రయత్నించండి.")
        .withSimpleCard("Chitti Bot - లోపం", fallback)
        .getResponse();
    }
  }
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const welcome = "హాయ్! నేను చిట్టి బాట్. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?";
    const phoneticWelcome = toPhonetic(welcome);
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="en-IN">${phoneticWelcome}</lang></speak>`)
      .reprompt("మీరు ఏమి అడగాలనుకుంటున్నారు?")
      .withSimpleCard("Chitti Bot", welcome)
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("🔥 Global Error:", error.message);
    const errorMessage = "లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి.";
    const errorPhonetic = toPhonetic(errorMessage);
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="en-IN">${errorPhonetic}</lang></speak>`)
      .reprompt("దయచేసి మళ్ళీ ప్రయత్నించండి.")
      .withSimpleCard("Chitti Bot - లోపం", errorMessage)
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
  try {
    const response = await skill.invoke(req.body, req.headers);
    res.json(response);
  } catch (err) {
    console.error("❌ Alexa Endpoint Error:", err.message);
    res.status(500).send("Internal Server Error");
  }
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
  res.send('✅ Chitti Bot is running with Telugu + ChatGPT support');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chitti backend running on port ${PORT}`));
