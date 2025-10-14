// backend/scripts/seedTemplates.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Template = require("../src/models/Template");

console.log("🔍 MONGO_URI =", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch(err => {
    console.error("❌ Lỗi kết nối MongoDB:", err);
    process.exit(1);
  });

const templates = [
  {
    name: "Landing Căn hộ hiện đại",
    type: "Căn hộ",
    style: "Hiện đại",
    thumbnail: "/backend/public/assets/feature1.png",
    filePath: "/landing-pages/landing1.html",
  },
  {
    name: "Landing Dự án Luxury",
    type: "Dự án BĐS",
    style: "Luxury",
    thumbnail: "../public/assets/feature1.png",
    filePath: "/landing-pages/landing2.html",
  },
];

async function seed() {
  try {
    await Template.deleteMany({});
    await Template.insertMany(templates);
    console.log("✅ Đã seed templates thành công!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi seed templates:", err);
    process.exit(1);
  }
}

seed();
