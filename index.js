const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const app = require("./app"); // your Express app
require("dotenv").config();

const PORT = process.env.PORT || 5000;  

// 1️⃣ Create HTTP server from Express app
const server = http.createServer(app);

// 2️⃣ Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins (restrict later for security)
    methods: ["GET", "POST"]
  }
});

// 3️⃣ Socket.IO connection
io.on("connection", (socket) => {
  console.log("⚡ Pilot connected:", socket.id);

  // Pilot joins pilot rooms
  socket.on("joinPilots", (pilotId) => {
    socket.join("pilots");
    socket.join(`pilot_${pilotId}`);
    console.log(`👨‍✈️ Pilot ${pilotId} joined rooms`);
  });

  // Claim order event
  socket.on("claimOrder", async ({ orderId, pilotId }) => {
    try {
      const Order = require("./Model/Order");

      // Atomically claim order
      const claimed = await Order.findOneAndUpdate(
        { _id: orderId, claimedBy: null }, // only if not claimed
        { claimedBy: pilotId, status: "Processing" },
        { new: true }
      );

      if (!claimed) {
        return socket.emit("claimResponse", {
          success: false,
          message: "Already claimed or unavailable"
        });
      }

      // Notify only the claiming pilot
      io.to(`pilot_${pilotId}`).emit("orderAssigned", { order: claimed });

      // Notify all pilots that this order is no longer available
      io.to("pilots").emit("orderClaimed", {
        orderId: claimed._id,
        claimedBy: claimed.claimedBy
      });
    } catch (err) {
      console.error(err);
      socket.emit("claimResponse", { success: false, message: "Server error" });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Pilot disconnected:", socket.id);
  });
});

// 4️⃣ Connect DB + start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () =>
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

module.exports = io; // export if you want to emit events in controllers
