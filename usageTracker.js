const fs = require('fs');
const path = require('path');

const usageFilePath = path.join(__dirname, 'usage.json');
const CHARACTER_LIMIT = 450000;

function getDateNDaysAgo(n) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split('T')[0];
}

function readUsage() {
  if (!fs.existsSync(usageFilePath)) {
    fs.writeFileSync(usageFilePath, JSON.stringify({ total: 0, daily: {} }, null, 2));
  }
  const data = fs.readFileSync(usageFilePath);
  return JSON.parse(data);
}

function writeUsage(data) {
  fs.writeFileSync(usageFilePath, JSON.stringify(data, null, 2));
}

exports.addAndCheck = (text) => {
  const charCount = text.length;
  const usage = readUsage();
  const today = getDateNDaysAgo(0);

  usage.total += charCount;
  usage.daily[today] = (usage.daily[today] || 0) + charCount;

  if (usage.total > CHARACTER_LIMIT) {
    throw new Error("Google Translate free-tier character limit exceeded.");
  }

  writeUsage(usage);
};

exports.getUsageStats = () => {
  const usage = readUsage();
  const today = getDateNDaysAgo(0);

  const last7 = new Set(Array.from({ length: 7 }, (_, i) => getDateNDaysAgo(i)));
  const last30 = new Set(Array.from({ length: 30 }, (_, i) => getDateNDaysAgo(i)));
  const last365 = new Set(Array.from({ length: 365 }, (_, i) => getDateNDaysAgo(i)));

  let week = 0, month = 0, year = 0;

  for (const date in usage.daily) {
    const val = usage.daily[date];
    if (last7.has(date)) week += val;
    if (last30.has(date)) month += val;
    if (last365.has(date)) year += val;
  }

  return {
    today: usage.daily[today] || 0,
    week,
    month,
    year,
    total: usage.total,
    limit: CHARACTER_LIMIT
  };
};
