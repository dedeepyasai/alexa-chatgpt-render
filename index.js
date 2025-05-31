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
      const userInput = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question');
      if (!userInput || userInput.trim() === '') {
        const fallbackMsg = "క్షమించండి, మీరు ఏమి చెప్పాలనుకుంటున్నారో నాకు తెలియలేదు.";
        const phonetic = toPhonetic(fallbackMsg);
        return handlerInput.responseBuilder
          .speak(`<speak><lang xml:lang=\"en-IN\">${phonetic}</lang></speak>`)
          .reprompt("దయచేసి మళ్ళీ ప్రశ్న అడగండి.")
          .getResponse();
      }

      console.log("🗣️ User input:", userInput);

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
      const phoneticTelugu = toPhonetic(teluguScript);

      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang=\"en-IN\">${phoneticTelugu}</lang></speak>`)
        .reprompt("ఇంకా ఏమైనా అడగాలా?")
        .withSimpleCard("Chitti Bot", teluguScript)
        .getResponse();
    } catch (err) {
      console.error("❌ ChatIntentHandler Error:", err);
      const fallback = "క్షమించండి, లోపం సంభవించింది. మళ్ళీ ప్రయత్నించండి.";
      const phoneticFallback = toPhonetic(fallback);
      return handlerInput.responseBuilder
        .speak(`<speak><lang xml:lang=\"en-IN\">${phoneticFallback}</lang></speak>`)
        .reprompt("దయచేసి మళ్ళీ ప్రయత్నించండి.")
        .withSimpleCard("Chitti Bot", fallback)
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
      .speak(`<speak><lang xml:lang=\"en-IN\">${phoneticWelcome}</lang></speak>`)
      .reprompt("మీరు ఏమి అడగాలనుకుంటున్నారు?")
      .withSimpleCard("Chitti Bot", welcome)
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const msg = "మీరు అడగాలనుకున్న ప్రశ్నను చెప్పండి.";
    const phonetic = toPhonetic(msg);
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang=\"en-IN\">${phonetic}</lang></speak>`)
      .reprompt("ఇంకా ఏమైనా అడగాలా?")
      .withSimpleCard("Chitti Bot Help", msg)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(Alexa.getIntentName(handlerInput.requestEnvelope));
  },
  handle(handlerInput) {
    const msg = "ధన్యవాదాలు! మళ్ళీ కలుద్దాం.";
    const phonetic = toPhonetic(msg);
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang=\"en-IN\">${phonetic}</lang></speak>`)
      .withSimpleCard("Chitti Bot", msg)
      .getResponse();
  }
};

const FallbackHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
               Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
  handle(handlerInput) {
    const msg = "క్షమించండి, నేను ఆ అభ్యర్థనను అర్థం చేసుకోలేను. మళ్ళీ ప్రయత్నించండి.";
    const phonetic = toPhonetic(msg);
    console.error("⚠️ Alexa triggered FallbackIntent — no intent matched.");
    console.error("🔴 Unmatched Request:", JSON.stringify(handlerInput.requestEnvelope, null, 2));
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang=\"en-IN\">${phonetic}</lang></speak>`)
      .reprompt("దయచేసి మరో ప్రశ్న అడగండి.")
      .withSimpleCard("Chitti Bot", msg)
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("🔥 General Error:", error.stack);
    const errorMessage = "లోపం సంభవించింది. దయచేసి మళ్ళీ ప్రయత్నించండి.";
    const errorPhonetic = toPhonetic(errorMessage);
    return handlerInput.responseBuilder
      .speak(`<speak><lang xml:lang=\"en-IN\">${errorPhonetic}</lang></speak>`)
      .reprompt("దయచేసి మళ్ళీ ప్రయత్నించండి.")
      .withSimpleCard("Chitti Bot - లోపం", errorMessage)
      .getResponse();
  }
};

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ChatIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackHandler
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
  res.send('✅ Chitti Bot is live with multilingual support!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chitti backend running on port ${PORT}`));