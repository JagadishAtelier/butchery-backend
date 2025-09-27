const express = require("express");
const router = express.Router();
const webpush = require("../services/notifications");
const Subscription = require("../Model/Subscription");
const NotificationHistory = require("../Model/NotificationHistory");

// ✅ Subscribe
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

// ✅ Send Notification (and save to history)
router.post("/send", async (req, res) => {
  const { title, body } = req.body;
  const payload = JSON.stringify({ title, body });

  try {
    const subscriptions = await Subscription.find({});

    await Promise.all(
      subscriptions.map((sub) =>
        webpush.sendNotification(sub, payload).catch(async (err) => {
          console.error("Push error:", err);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await Subscription.deleteOne({ endpoint: sub.endpoint });
            console.log("Removed invalid subscription:", sub.endpoint);
          }
        })
      )
    );

    // Save history
    await NotificationHistory.create({ title, body });

    res.status(200).json({ message: "Notifications sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

// ✅ Get Notification History
router.get("/history", async (req, res) => {
  try {
    const history = await NotificationHistory.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ✅ Resend Notification by ID
router.post("/resend/:id", async (req, res) => {
  try {
    const notification = await NotificationHistory.findById(req.params.id);
    if (!notification) return res.status(404).json({ error: "Not found" });

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
    });

    const subscriptions = await Subscription.find({});
    await Promise.all(
      subscriptions.map((sub) =>
        webpush.sendNotification(sub, payload).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await Subscription.deleteOne({ endpoint: sub.endpoint });
          }
        })
      )
    );

    res.json({ message: "Notification resent successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to resend notification" });
  }
});

module.exports = router;
