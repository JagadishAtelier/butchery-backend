const webpush = require("web-push");
require("dotenv").config();

// setup VAPID
webpush.setVapidDetails(
  "mailto:iraichikadai@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = webpush;
