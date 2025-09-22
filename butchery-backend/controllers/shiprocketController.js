const {
  authShiprocket,
  shiprocketRequest,
} = require("../services/shiprocketService");

exports.login = async (req, res) => {
  try {
    const token = await authShiprocket();
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { data } = await shiprocketRequest("get", "/v1/external/orders");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.assignAwb = async (req, res) => {
  try {
    const { data } = await shiprocketRequest("post", "/v1/external/courier/assign/awb", req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.schedulePickup = async (req, res) => {
  try {
    const { data } = await shiprocketRequest("post", "/v1/external/pickups/schedule", req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.trackShipment = async (req, res) => {
  try {
    const { data } = await shiprocketRequest("get", `/v1/external/courier/track/${req.params.id}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLabel = async (req, res) => {
  try {
    const { data } = await shiprocketRequest("get", `/v1/external/courier/generate/label/${req.params.id}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
