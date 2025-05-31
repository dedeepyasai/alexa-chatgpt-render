const { Translate } = require('@google-cloud/translate').v2;
const lip = require('lipitva').default; // 👈 IMPORTANT CHANGE

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
  return lip.transliterate({
    data: teluguText,
    from: 'telugu',
    to: 'itrans'
  });
};
