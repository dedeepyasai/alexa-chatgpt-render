const { Translate } = require('@google-cloud/translate').v2;
const lipitva = require('lipitva'); // Don't destructure here

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

const translate = new Translate({
  credentials,
  projectId: credentials.project_id
});

exports.toEnglish = async (text) => {
  const [translated] = await translate.translate(text, 'en');
  return translated;
};

exports.toTelugu = async (text) => {
  const [translated] = await translate.translate(text, 'te');
  return translated;
};

exports.toPhonetic = (teluguText) => {
  if (typeof lipitva.transliterate !== 'function') {
    console.error("🚫 lipitva.transliterate is undefined!");
    return "kshaminchandi, lipitva error.";
  }
  
  console.log("💡 lipitva:", lipitva);

  return lipitva.transliterate({
    data: teluguText,
    from: 'telugu',
    to: 'itrans'
  });
};
