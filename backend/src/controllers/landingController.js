const fs = require("fs");
const path = require("path");
const Landing = require("../models/Landing");
const Template = require("../models/Template");

// ✅ Clone template -> tạo landing cho user
exports.cloneLanding = async (req, res) => {
  try {
    const { userId, templateId, name } = req.body;
    console.log("📥 Clone nhận:", req.body);

    if (!userId || !templateId)
      return res.status(400).json({ error: "Thiếu dữ liệu bắt buộc" });

    // Tìm template gốc
    const template = await Template.findById(templateId);
    if (!template)
      return res.status(404).json({ error: "Không tìm thấy template" });

    // Đảm bảo thư mục tồn tại
    const templateDir = path.join(__dirname, "../public/landing-pages");
    const userDir = path.join(__dirname, "../public/user-landing-pages");
    fs.mkdirSync(templateDir, { recursive: true });
    fs.mkdirSync(userDir, { recursive: true });

    // Đường dẫn file gốc
    const templateFile = path.join(templateDir, path.basename(template.filePath || `landing-${templateId}.html`));
    // Nếu file template không có, tạo placeholder
    if (!fs.existsSync(templateFile)) {
      const placeholderHTML = `
        <html>
          <head><title>${name || "Landing Template"}</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:40px;">
            <h1>${name || "Landing Template"}</h1>
            <p>Đây là landing được tạo tự động cho template ${templateId}</p>
          </body>
        </html>`;
      fs.writeFileSync(templateFile, placeholderHTML, "utf8");
    }

    // Copy file sang kho user
    const userFileName = `user-${userId}-${Date.now()}.html`;
    const userFilePath = path.join(userDir, userFileName);
    fs.copyFileSync(templateFile, userFilePath);

    // Lưu DB
    const newLanding = await Landing.create({
      userId,
      name: name || template.name,
      htmlPath: `/user-landing-pages/${userFileName}`,
      thumbnail: template.thumbnail,
      type: template.type,
      style: template.style,
    });

    console.log("✅ Đã lưu landing:", newLanding);
    res.json({ success: true, landing: newLanding });
  } catch (err) {
    console.error("❌ Lỗi cloneLanding:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

// ✅ Lấy danh sách landing của user
exports.getUserLandings = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("📥 MyLibrary API nhận userId:", userId);

    const landings = await Landing.find({ userId });
    console.log("📦 Tìm thấy", landings.length, "landing");

    const baseURL = process.env.BASE_URL || "http://localhost:5000";

    res.json(
      landings.map((l) => ({
        _id: l._id,
        name: l.name,
        thumbnail: l.thumbnail,
        landingPageUrl: `${baseURL}${l.htmlPath}`,
        type: l.type,
        style: l.style,
      }))
    );
  } catch (err) {
    console.error("❌ Lỗi getUserLandings:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};
