// const express = require("express");
// const fs = require("fs");
// const path = require("path");
// const LandingPage = require("../models/LandingPage");
// const router = express.Router();

// // Clone template vào kho user
// router.post("/clone", async (req, res) => {
//   const { userId, templateId, name } = req.body;
//   const templateFile = path.join(__dirname, "../public/landing-pages/landing" + templateId + ".html");
//   if (!fs.existsSync(templateFile)) return res.status(404).json({ error: "Template không tồn tại" });

//   const userFileName = `user-${userId}-landing-${Date.now()}.html`;
//   const userFilePath = path.join(__dirname, "../public/user-landing-pages/", userFileName);

//   // Copy file HTML
//   fs.copyFileSync(templateFile, userFilePath);

//   // Lấy HTML content
//   const htmlContent = fs.readFileSync(userFilePath, "utf8");

//   // Tạo record DB
//   const landingPage = await LandingPage.create({
//     userId,
//     templateId,
//     name: name || `Landing ${templateId}`,
//     landingPageUrl: `/user-landing-pages/${userFileName}`,
//     htmlContent,
//   });

//   res.json({ success: true, landingPage });
// });

// // Lấy danh sách landing page của user
// router.get("/my/:userId", async (req, res) => {
//   const { userId } = req.params;
//   const pages = await LandingPage.find({ userId });
//   res.json(pages);
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const landingController = require("../controllers/landingController");

// Clone template vào kho user
router.post("/clone", landingController.cloneLanding);

// Lấy danh sách landing page của user
router.get("/my/:userId", landingController.getUserLandings);

module.exports = router;
