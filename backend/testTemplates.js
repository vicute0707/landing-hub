// backend/testTemplates.js
const mongoose = require("mongoose");
const Template = require("./src/models/Template");

mongoose.connect("mongodb+srv://vi0978294041_db_user:tuongvi0707@landinghub-iconic.ral6urs.mongodb.net/landinghub?retryWrites=true&w=majority&appName=Landinghub-iconic")
  .then(async () => {
    console.log("✅ Kết nối MongoDB thành công!");
    const data = await Template.find();
    console.log("📦 Dữ liệu Template hiện có:", data);
    process.exit();
  })
  .catch(err => {
    console.error("❌ Lỗi kết nối MongoDB:", err);
    process.exit(1);
  });
