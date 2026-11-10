import mongoose from "mongoose";
import dotenv from "dotenv";

// Load .env
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pos";

    await mongoose.connect(mongoURI);

    console.log("✅ MongoDB Connected Successfully to:", mongoURI);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Stop the app on DB failure
  }
};

export default connectDB;
