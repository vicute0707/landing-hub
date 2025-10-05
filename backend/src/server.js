// backend/src/server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// ===== Middleware =====
app.use(
  cors({
    origin: process.env.REACT_APP_API_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// ===== MongoDB connection =====
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));
} else {
  console.warn("⚠️ MONGO_URI is missing in .env file");
}

// ====== Models ======
const Lead = require("./models/Lead"); // ✅ thêm dòng này

// ====== Auto seed data ======
const seedData = async () => {
  try {
    const count = await Lead.countDocuments();
    if (count === 0) {
      await Lead.insertMany([
        { name: "Nguyễn Văn A", email: "a@gmail.com", phone: "0900000001", status: "new", notes: "Khách tiềm năng" },
        { name: "Trần Thị B", email: "b@gmail.com", phone: "0900000002", status: "processing", notes: "Đang liên hệ" },
        { name: "Lê Văn C", email: "c@gmail.com", phone: "0900000003", status: "converted", notes: "Đã chốt đơn" },
        { name: "Phạm Thị D", email: "d@gmail.com", phone: "0900000004", status: "lost", notes: "Không phản hồi" },
      ]);
      console.log("🌱 Lead sample data inserted");
    }
  } catch (err) {
    console.error("❌ Seed data error:", err);
  }
};

// Gọi khi DB sẵn sàng
mongoose.connection.once("open", seedData);

// ===== Routes =====
const paymentRoutes = require("./routes/payment");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const leadRoutes = require("./routes/leads"); // ✅ thêm routes lead

app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/leads", leadRoutes); // ✅ mount API leads

// ===== Health check =====
app.get("/", (req, res) => {
  res.send("<h2>Backend is running ✅</h2>");
});

// ===== Start server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
