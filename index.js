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
      console.log('🗣️ User input:', userInput);

      const englishInput = await toEnglish(userInput);
      console.log('🌐 Translated to English:', englishInput);

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
      console.log('🤖 GPT Output:', englishOutput);

      const teluguOutput = await toTelugu(englishOutput);
      console.log('🌐 Telugu Translation:', teluguOutput);

      const phonetic = toPhonetic(teluguOutput);
      console.log('🗣️ Alexa will speak:', phonetic);

      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang='en-IN'>${phonetic}</lang></speak>`)
        .reprompt("<speak>inkaa emina adagavacchaa?</speak>")
        .withSimpleCard("Teddy Bot", teluguOutput)
        .getResponse();

    } catch (err) {
      console.error("🔥 General Error:", err);
      return handlerInput.responseBuilder
        .speak("<speak><lang xml:lang='en-IN'>kshamimchamdi, nenu a abhyarthananu artham chesukolenu. malli prayatnimchamdi.</lang></speak>")
        .withSimpleCard("Teddy Bot", "క్షమించండి, నేను ఆ అభ్యర్థనను అర్థం చేసుకోలేను. మళ్ళీ ప్రయత్నించండి.")
        .reprompt("<speak>దయచేసి మరో ప్రశ్న అడగండి.</speak>")
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
      .speak("<speak><lang xml:lang='en-IN'>hAy! nenu TeDDI bOT. mIru emi taelusukovaalanukuntunnAru?</lang></speak>")
      .reprompt("<speak>inkaa emina adagavacchaa?</speak>")
      .withSimpleCard("Teddy Bot", "హాయ్! నేను టెడ్డీ బాట్. మీరు ఏం తెలుసుకోవాలనుకుంటున్నారు?")
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("❌ ERROR:", error.message);
    return handlerInput.responseBuilder
      .speak("<speak><lang xml:lang='en-IN'>kshamimchamdi, lOpam sambhavinchindi.</lang></speak>")
      .withSimpleCard("Teddy Bot", "క్షమించండి, లోపం సంభవించింది.")
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
  res.send('Teddy Bot Alexa ChatGPT is live!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Teddy Bot backend running on port ${PORT}`));
