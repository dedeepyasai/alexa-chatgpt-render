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
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ee')
    .replace(/ū/g, 'oo')
    .replace(/ṉ/g, 'n')
    .replace(/ṁ/g, 'm')
    .replace(/ṭ/g, 't')
    .replace(/ḍ/g, 'd')
    .replace(/ṅ/g, 'ng')
    .replace(/ñ/g, 'ny')
    .replace(/ś/g, 'sh')
    .replace(/ṣ/g, 'sh')
    .replace(/ḥ/g, 'h')
    .replace(/ṇ/g, 'n')
    .replace(/[A-Z]/g, (m) => m.toLowerCase()) // Convert remaining uppercase to lowercase
    .replace(/[^\x00-\x7F]/g, '')              // Remove leftover non-ASCII
    .trim();
};
