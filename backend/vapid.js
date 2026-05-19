const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

let vapidKeys;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  // Production: read from environment variables
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  };
} else {
  // Development: generate and save to file
  const keysPath = path.join(__dirname, 'data', 'vapid_keys.json');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (fs.existsSync(keysPath)) {
    vapidKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(keysPath, JSON.stringify(vapidKeys));
    console.log('\n=== VAPID KEYS GENERATED ===');
    console.log('Add these to your Railway environment variables:');
    console.log('VAPID_PUBLIC_KEY =', vapidKeys.publicKey);
    console.log('VAPID_PRIVATE_KEY =', vapidKeys.privateKey);
    console.log('============================\n');
  }
}

webpush.setVapidDetails(
  process.env.VAPID_MAILTO || 'mailto:maktaba@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

module.exports = { webpush, publicKey: vapidKeys.publicKey };
