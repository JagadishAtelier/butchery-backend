const express = require("express");
const router = express.Router();
const webpush = require("../services/notifications");
const Subscription = require("../Model/Subscription");


router.post("/subscribe", async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    await Subscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: "Subscribed!" });
  } catch (err) {
    console.error("Subscription error:", err);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});


router.post("/send", async (req, res) => {
  const { title, body } = req.body;

  const payload = JSON.stringify({ title, body });

  try {
    const subscriptions = await Subscription.find({});

    await Promise.all(
      subscriptions.map((sub) =>
        webpush
          .sendNotification(sub, payload)
          .catch(async (err) => {
            console.error("Push error:", err);
            if (err.statusCode === 410 || err.statusCode === 404) {
              await Subscription.deleteOne({ endpoint: sub.endpoint });
              console.log("Removed invalid subscription:", sub.endpoint);
            }
          })
      )
    );

    res.status(200).json({ message: "Notifications sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

module.exports = router;
