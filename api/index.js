const { initDb } = require('../backend/db');
const app = require('../backend/server');

let ready = false;

module.exports = async (req, res) => {
  if (!ready) {
    await initDb();
    ready = true;
  }
  app(req, res);
};
