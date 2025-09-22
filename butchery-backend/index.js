const app = require("./app");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB connected");
  app.listen(process.env.PORT || 5000, () =>
    console.log(`Server running on port http://localhost:${process.env.PORT || 5000}`)
  );
})
.catch(err => console.error("MongoDB connection failed", err));
