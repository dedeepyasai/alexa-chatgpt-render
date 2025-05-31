const { Translate } = require('@google-cloud/translate').v2;

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON); // injected from Render

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
