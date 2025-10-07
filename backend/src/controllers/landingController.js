const fs = require("fs");
const path = require("path");
const LandingPage = require("../models/LandingPage");

// Clone template vào kho user (dùng template giả lập nếu chưa có file)
exports.cloneLanding = async (req, res) => {
  try {
    const { userId, templateId, name } = req.body;
    if (!userId || !templateId) return res.status(400).json({ error: "Thiếu dữ liệu bắt buộc" });

    const templateDir = path.join(__dirname, "../public/landing-pages");
    if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });

    const templateFile = path.join(templateDir, `landing${templateId}.html`);

    // Nếu file template chưa có thì tạo file HTML placeholder
    if (!fs.existsSync(templateFile)) {
      const placeholderHTML = `
        <html>
          <head><title>${name || `Landing ${templateId}`}</title></head>
          <body style="font-family: sans-serif; text-align:center; padding:50px;">
            <h1>${name || `Landing ${templateId}`}</h1>
            <p>Đây là template demo #${templateId}</p>
          </body>
        </html>
      `;
      fs.writeFileSync(templateFile, placeholderHTML, "utf8");
    }

    // Copy vào kho user
    const userDir = path.join(__dirname, "../public/user-landing-pages");
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    const userFileName = `user-${userId}-landing-${Date.now()}.html`;
    const userFilePath = path.join(userDir, userFileName);
    fs.copyFileSync(templateFile, userFilePath);

    const htmlContent = fs.readFileSync(userFilePath, "utf8");

    const landingPage = await LandingPage.create({
      userId,
      templateId,
      name: name || `Landing ${templateId}`,
      landingPageUrl: `/public/user-landing-pages/${userFileName}`,
      htmlContent,
    });

    res.json({ success: true, landingPage });
  } catch (err) {
    console.error("❌ Lỗi cloneLanding:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

// Lấy danh sách landing page của user
exports.getUserLandings = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "Thiếu userId" });

    const pages = await LandingPage.find({ userId });
    res.json(pages);
  } catch (err) {
    console.error("❌ Lỗi getUserLandings:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};
