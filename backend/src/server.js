// backend/src/server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const RSSParser = require("rss-parser");
const NodeCache = require("node-cache");
const crypto = require("crypto"); 
const fs = require("fs");
const path = require("path");

const app = express();
const CACHE_TTL = 60 * 10; 
const UPDATE_INTERVAL_MS = 1000 * 60 * 5;

// ===== RSS Parser =====
const parser = new RSSParser({
  timeout: 10000,
  customFields: {
    item: [
      ['media:content', 'media'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
    ]
  }
});

const FEEDS = [
  "https://vnexpress.net/rss/bat-dong-san.rss",
  "https://cafef.vn/bat-dong-san.rss",
  "https://vnexpress.net/rss/kinh-doanh.rss",
  "https://cafef.vn/thi-truong.rss"
];

const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 120 });

// ===== RSS Helpers =====
function getSourceName(feedUrl) {
  const sources = { 'vnexpress.net': 'VnExpress', 'cafef.vn': 'CafeF' };
  for (const [domain, name] of Object.entries(sources)) if (feedUrl.includes(domain)) return name;
  return 'Nguồn khác';
}

function normalizeArticle(item, feedUrl) {
  const id = crypto.createHash("md5").update(item.link || item.title).digest("hex");
  let thumbnail = null;
  if (item.media && item.media.$ && item.media.$.url) thumbnail = item.media.$.url;
  else if (item.enclosure && item.enclosure.url) thumbnail = item.enclosure.url;
  else if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) thumbnail = imgMatch[1];
  }
  const excerpt = item.contentSnippet || (item.content && item.content.replace(/<[^>]+>/g, "").substring(0, 200)) || "";
  return {
    id,
    title: item.title || "Không có tiêu đề",
    link: item.link,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    source: getSourceName(feedUrl),
    thumbnail,
    excerpt: excerpt + '...',
    content: item.contentEncoded || item.content || item.description,
    feedUrl
  };
}

async function fetchAllFeeds() {
  const allItems = [];
  for (const url of FEEDS) {
    try {
      console.log(`🔄 Đang tải RSS từ: ${url}`);
      const feed = await parser.parseURL(url);
      feed.items.forEach(item => allItems.push(normalizeArticle(item, url)));
      console.log(`✅ Đã tải ${feed.items.length} bài từ ${url}`);
    } catch (err) { console.error(`❌ Lỗi khi tải ${url}:`, err.message); }
  }
  allItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  cache.set("articles", allItems);
  allItems.forEach(article => cache.set(`article:${article.id}`, article));
  console.log(`🎯 Tổng số bài viết đã lưu: ${allItems.length}`);
  return allItems;
}

fetchAllFeeds().then(() => console.log("✅ Khởi tạo dữ liệu RSS hoàn tất")).catch(console.error);
setInterval(() => fetchAllFeeds().catch(e => console.error("Lỗi cập nhật nền:", e)), UPDATE_INTERVAL_MS);

// ===== Middleware =====
app.use(cors({
  origin: process.env.REACT_APP_FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));

// ===== MongoDB =====
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Đã kết nối MongoDB"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));
}

// ===== Models =====
const landingPageSchema = new mongoose.Schema({
  userId: String,
  templateId: Number,
  name: String,
  landingPageUrl: String,
  htmlContent: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const LandingPage = mongoose.model("LandingPage", landingPageSchema);

// ===== Landing Page APIs =====
app.post("/api/landing/clone", async (req, res) => {
  try {
    const { userId, templateId, name } = req.body;
    if (!userId || !templateId) return res.status(400).json({ error: "Thiếu dữ liệu bắt buộc" });

    // tạo thư mục nếu chưa tồn tại
    const templateDir = path.join(__dirname, "public/landing-pages");
    if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });

    const templateFile = path.join(templateDir, `landing${templateId}.html`);
    if (!fs.existsSync(templateFile)) {
      // tạo placeholder template
      const placeholderHTML = `
        <html>
          <head><title>${name || `Landing ${templateId}`}</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px;">
            <h1>${name || `Landing ${templateId}`}</h1>
            <p>Đây là template demo #${templateId}</p>
          </body>
        </html>`;
      fs.writeFileSync(templateFile, placeholderHTML, "utf8");
    }

    // tạo thư mục user nếu chưa có
    const userDir = path.join(__dirname, "public/user-landing-pages");
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
    console.error("❌ Lỗi API /api/landing/clone:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});

// Lấy danh sách landing page của user
app.get("/api/landing/my/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const pages = await LandingPage.find({ userId });
    res.json(pages);
  } catch (err) {
    console.error("❌ Lỗi API /api/landing/my/:userId:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});

// ===== News APIs (giữ nguyên) =====
app.get("/api/news", (req, res) => {
  try {
    const allArticles = cache.get("articles") || [];
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.max(1, parseInt(req.query.limit || "12"));
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    res.json({
      total: allArticles.length,
      page,
      limit,
      articles: allArticles.slice(startIndex, endIndex)
    });
  } catch (error) {
    console.error("Lỗi API /api/news:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});

app.get("/api/news/:id", (req, res) => {
  try {
    const articleId = req.params.id;
    const article = cache.get(`article:${articleId}`);
    if (!article) return res.status(404).json({ error: "Không tìm thấy bài viết" });
    res.json({ article });
  } catch (error) {
    console.error("Lỗi API /api/news/:id:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send(`
    <h2>Backend Tin Tức BĐS 🚀</h2>
    <p>Server đang chạy ổn định</p>
    <p>Tổng số bài viết trong cache: ${cache.get("articles")?.length || 0}</p>
    <p><a href="/api/news">Xem danh sách tin tức</a></p>
  `);
});

// ===== Start server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy trên cổng ${PORT}`);
  console.log(`📡 Truy cập: http://localhost:${PORT}`);
});

// ===== Routes =====
app.use("/api/leads", require("./routes/leads"));
// nếu bạn có auth route
// const authRoutes = require("./routes/auth");
// app.use("/api/auth", authRoutes);
