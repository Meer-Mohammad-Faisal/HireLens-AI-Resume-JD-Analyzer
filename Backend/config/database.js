const mongoose = require("mongoose");

async function connectToDB() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("MONGO_URI not set — skipping database connection (development mode)");
      return;
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectToDB;
