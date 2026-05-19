const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const keysPath = path.join(__dirname, 'data', 'vapid_keys.json');

let vapidKeys;
if (fs.existsSync(keysPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(keysPath, JSON.stringify(vapidKeys));
}

webpush.setVapidDetails('mailto:maktaba@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

module.exports = { webpush, publicKey: vapidKeys.publicKey };
