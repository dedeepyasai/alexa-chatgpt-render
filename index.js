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
      console.log("🎤 User input:", userInput);

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
      console.log("🤖 GPT Output:", englishOutput);

      const teluguScript = await toTelugu(englishOutput);
      console.log("🌐 Telugu Translation:", teluguScript);

      let phoneticTelugu;
      try {
        phoneticTelugu = toPhonetic(teluguScript);
        console.log("🗣️ Phonetic Telugu:", phoneticTelugu);
      } catch (e) {
        console.error("❌ Transliteration failed:", e.message);
        phoneticTelugu = "kshaminchandi, nenu telugu lo cheppaleka pothunna.";
      }

      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="en-IN">${phoneticTelugu}</lang></speak>`)
        .reprompt("inkaa emina adagavacchaa?")
        .withSimpleCard("Chitti", teluguScript)
        .getResponse();

    } catch (err) {
      console.error("❌ ChatIntentHandler Error:", err.message);
      const fallbackTelugu = "క్షమించండి, లోపం సంభవించింది. మళ్ళీ ప్రయత్నించండి.";
      let fallbackPhonetic = "kshaminchandi, lopam sambhavinchindi.";
      try {
        fallbackPhonetic = toPhonetic(fallbackTelugu);
      } catch (e) {
        console.error("❌ Fallback transliteration failed:", e.message);
      }

      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang="en-IN">${fallbackPhonetic}</lang></speak>`)
        .reprompt("మళ్ళీ ప్రయత్నించండి.")
        .withSimpleCard("Chitti - లోపం", fallbackTelugu)
        .getResponse();
    }
  }
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const teluguWelcome = "హాయ్! నేను చిట్టి. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?";
    let phoneticWelcome = "haayi! nenu chitti. meeru emi telusukovaalanukuntunnaru?";
    try {
      phoneticWelcome = toPhonetic(teluguWelcome);
    } catch (e) {
      console.error("❌ Welcome transliteration failed:", e.message);
    }

    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="en-IN">${phoneticWelcome}</lang></speak>`)
      .reprompt("మీరు ఏమి అడగాలనుకుంటున్నారు?")
      .withSimpleCard("Chitti", teluguWelcome)
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
    let phoneticFallback = "kshaminchandi, lopam sambhavinchindi.";
    try {
      phoneticFallback = toPhonetic(errorMessage);
    } catch (e) {
      console.error("❌ Error fallback transliteration failed:", e.message);
    }

    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang="en-IN">${phoneticFallback}</lang></speak>`)
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
  try {
    const response = await skill.invoke(req.body, req.headers);
    res.json(response);
  } catch (err) {
    console.error("❌ Alexa POST /alexa error:", err.message);
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
  res.send('✅ Chitti Alexa + ChatGPT Telugu Translator is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chitti backend running on port ${PORT}`));
