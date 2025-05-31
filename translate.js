const { Translate } = require('@google-cloud/translate').v2;
const { Lip, ScriptsRegistry } = require('lipitva'); // 👈 Correct imports

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

// Set up Google Translate
const translate = new Translate({
  credentials,
  projectId: credentials.project_id
});

// ✅ Create instance of Lip class with its registry
const lip = new Lip(new ScriptsRegistry());

exports.toEnglish = async (text) => {
  const [translated] = await translate.translate(text, 'en');
  return translated;
};

exports.toTelugu = async (text) => {
  const [translated] = await translate.translate(text, 'te');
  return translated;
};

exports.toPhonetic = (teluguText) => {
  const raw = lip.t({
    data: teluguText,
    from: 'telugu',
    to: 'itrans'
  });

  // Optional: Alexa-friendly simplification
  return raw
    .replace(/M/g, 'm')
    .replace(/D/g, 'd')
    .replace(/T/g, 't')
    .replace(/N/g, 'n')
    .replace(/L/g, 'l')
    .replace(/CH/g, 'ch')
    .toLowerCase();
};
