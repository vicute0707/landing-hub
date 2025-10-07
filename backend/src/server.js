// backend/src/server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const RSSParser = require("rss-parser");
const NodeCache = require("node-cache");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// ===== Middleware =====
app.use(cors({
  origin: process.env.REACT_APP_FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ===== Static files (phải có trước khi định nghĩa routes) =====
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/landing-pages", express.static(path.join(__dirname, "../public/landing-pages")));
app.use("/user-landing-pages", express.static(path.join(__dirname, "../public/user-landing-pages")));

// ===== MongoDB =====
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Đã kết nối MongoDB"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));
} else {
  console.warn("⚠️ Chưa có MONGO_URI trong file .env");
}

// ====== RSS Parser + Cache ======
const CACHE_TTL = 60 * 10; // 10 phút
const UPDATE_INTERVAL_MS = 1000 * 60 * 5; // 5 phút
const parser = new RSSParser({
  timeout: 10000,
  customFields: {
    item: [
      ["media:content", "media"],
      ["content:encoded", "contentEncoded"],
      ["dc:creator", "creator"],
    ],
  },
});
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 120 });
const FEEDS = [
  "https://vnexpress.net/rss/bat-dong-san.rss",
  "https://cafef.vn/bat-dong-san.rss",
  "https://vnexpress.net/rss/kinh-doanh.rss",
  "https://cafef.vn/thi-truong.rss",
];

// ====== RSS Helpers ======
function getSourceName(feedUrl) {
  const sources = { "vnexpress.net": "VnExpress", "cafef.vn": "CafeF" };
  for (const [domain, name] of Object.entries(sources))
    if (feedUrl.includes(domain)) return name;
  return "Nguồn khác";
}
function normalizeArticle(item, feedUrl) {
  const id = crypto.createHash("md5").update(item.link || item.title).digest("hex");
  let thumbnail = null;
  if (item.media?.$?.url) thumbnail = item.media.$.url;
  else if (item.enclosure?.url) thumbnail = item.enclosure.url;
  else if (item.contentEncoded) {
    const match = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
    if (match) thumbnail = match[1];
  }
  const excerpt = item.contentSnippet ||
    (item.content?.replace(/<[^>]+>/g, "").substring(0, 200)) ||
    "";
  return {
    id,
    title: item.title || "Không có tiêu đề",
    link: item.link,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    source: getSourceName(feedUrl),
    thumbnail,
    excerpt: excerpt + "...",
    content: item.contentEncoded || item.content || item.description,
    feedUrl,
  };
}

// ====== RSS Fetch ======
async function fetchAllFeeds() {
  const allItems = [];
  for (const url of FEEDS) {
    try {
      console.log(`🔄 Đang tải RSS từ: ${url}`);
      const feed = await parser.parseURL(url);
      feed.items.forEach(i => allItems.push(normalizeArticle(i, url)));
      console.log(`✅ Đã tải ${feed.items.length} bài từ ${url}`);
    } catch (err) {
      console.error(`❌ Lỗi khi tải ${url}:`, err.message);
    }
  }
  allItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  cache.set("articles", allItems);
  allItems.forEach(a => cache.set(`article:${a.id}`, a));
  console.log(`🎯 Tổng số bài viết đã lưu: ${allItems.length}`);
  return allItems;
}
fetchAllFeeds()
  .then(() => console.log("✅ RSS init xong"))
  .catch(console.error);
setInterval(() => fetchAllFeeds().catch(e => console.error("Lỗi cập nhật RSS:", e)), UPDATE_INTERVAL_MS);

// ====== Routes ======
const authRoutes = require("./routes/auth");
const templateRoutes = require("./routes/template");
const leadsRoutes = require("./routes/leads");
const landingRoutes = require("./routes/landingRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/landing", landingRoutes);

// ====== News APIs ======
app.get("/api/news", (req, res) => {
  try {
    const all = cache.get("articles") || [];
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "12");
    res.json({
      total: all.length,
      page,
      limit,
      articles: all.slice((page - 1) * limit, page * limit),
    });
  } catch (err) {
    console.error("Lỗi API /api/news:", err);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});

app.get("/api/news/:id", (req, res) => {
  const article = cache.get(`article:${req.params.id}`);
  if (!article) return res.status(404).json({ error: "Không tìm thấy bài viết" });
  res.json({ article });
});
// Phục vụ thư mục landing-pages và user-landing-pages
app.use("/landing-pages", express.static(path.join(__dirname, "public/landing-pages")));
app.use("/user-landing-pages", express.static(path.join(__dirname, "public/user-landing-pages")));
// ====== Health Check ======
app.get("/", (req, res) => {
  res.send(`
    <h2>🚀 Backend LandingHub hoạt động!</h2>
    <p>Tổng số bài RSS: ${cache.get("articles")?.length || 0}</p>
    <a href="/api/templates">Xem templates</a>
  `);
});
const reportRoutes = require('./routes/reports');
app.use('/api/reports', reportRoutes);

// ====== Start Server ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
});
