// backend/src/server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Routes
const paymentRoutes = require("./routes/payment");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

const app = express();

// ===== Middleware =====
app.use(cors({ origin: process.env.REACT_APP_API_URL || "http://localhost:3000" }));
app.use(express.json());

// ===== MongoDB connection =====
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

// ===== Routes =====
app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// ===== Health check =====
app.get("/", (req, res) => {
  res.send("<h2>Backend is running ✅</h2>");
});

// ===== Start server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
