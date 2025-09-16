import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import paymentRouter from "./routes/paymentRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/landinghub", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB error:", err));

app.use("/api/payment", paymentRouter);

app.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000");
});