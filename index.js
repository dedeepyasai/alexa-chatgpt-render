require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Alexa = require('ask-sdk-core');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const ChatIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChatIntent';
  },
  async handle(handlerInput) {
    const question = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question') || 'Say something';
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: question }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;

    return handlerInput.responseBuilder
      .speak(reply)
      .reprompt("Would you like to continue?")
      .getResponse();
  }
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Welcome to your ChatGPT voice assistant. Ask me anything.")
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(`Error handled: ${error.message}`);
    return handlerInput.responseBuilder
      .speak("Sorry, something went wrong.")
      .getResponse();
  }
};

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(LaunchRequestHandler, ChatIntentHandler)
  .addErrorHandlers(ErrorHandler)
  .create();

app.post('/alexa', async (req, res) => {
  const response = await skill.invoke(req.body, req.headers);
  res.json(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Alexa ChatGPT server running on port ${PORT}`));
