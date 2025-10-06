// backend/src/server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const RSSParser = require("rss-parser");
const NodeCache = require("node-cache");
const crypto = require("crypto"); // Thêm thư viện crypto để tạo ID

const app = express();
const CACHE_TTL = 60 * 10; // 10 phút
const UPDATE_INTERVAL_MS = 1000 * 60 * 5; // 5 phút

// Cấu hình RSS Parser để đọc các trường tùy chỉnh từ feed
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

// Danh sách các RSS feed Việt Nam
const FEEDS = [
  "https://vnexpress.net/rss/bat-dong-san.rss",
  "https://cafef.vn/bat-dong-san.rss",
  "https://vnexpress.net/rss/kinh-doanh.rss",
  "https://cafef.vn/thi-truong.rss"
];

const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 120 });

// Hàm chuẩn hóa tên nguồn tin
function getSourceName(feedUrl) {
  const sources = {
    'vnexpress.net': 'VnExpress',
    'cafef.vn': 'CafeF',
  };
  for (const [domain, name] of Object.entries(sources)) {
    if (feedUrl.includes(domain)) return name;
  }
  return 'Nguồn khác';
}

// Hàm chuẩn hóa dữ liệu bài viết từ RSS
function normalizeArticle(item, feedUrl) {
  const id = crypto.createHash("md5").update(item.link || item.title).digest("hex");
  
  // Trích xuất ảnh đại diện từ nhiều nguồn khác nhau trong RSS
  let thumbnail = null;
  if (item.media && item.media.$ && item.media.$.url) {
    thumbnail = item.media.$.url;
  } else if (item.enclosure && item.enclosure.url) {
    thumbnail = item.enclosure.url;
  } else if (item.contentEncoded) {
    const imgMatch = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) thumbnail = imgMatch[1];
  }

  // Tạo đoạn mô tả ngắn
  const excerpt = item.contentSnippet || 
                 (item.content && item.content.replace(/<[^>]+>/g, "").substring(0, 200)) || 
                 "";

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

// Hàm lấy tất cả tin tức từ các nguồn RSS
async function fetchAllFeeds() {
  const allItems = [];
  
  for (const url of FEEDS) {
    try {
      console.log(`🔄 Đang tải RSS từ: ${url}`);
      const feed = await parser.parseURL(url);
      
      feed.items.forEach((item) => {
        const normalizedArticle = normalizeArticle(item, url);
        allItems.push(normalizedArticle);
      });
      
      console.log(`✅ Đã tải ${feed.items.length} bài từ ${url}`);
    } catch (err) {
      console.error(`❌ Lỗi khi tải ${url}:`, err.message);
    }
  }

  // Sắp xếp theo thời gian đăng bài (mới nhất đầu tiên)
  allItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // Lưu vào cache
  cache.set("articles", allItems);
  allItems.forEach(article => {
    cache.set(`article:${article.id}`, article);
  });
  
  console.log(`🎯 Tổng số bài viết đã lưu: ${allItems.length}`);
  return allItems;
}

// Khởi chạy lần đầu và thiết lập cập nhật tự định kỳ
fetchAllFeeds()
  .then(() => console.log("✅ Khởi tạo dữ liệu RSS hoàn tất"))
  .catch(console.error);

setInterval(() => {
  fetchAllFeeds().catch(e => console.error("Lỗi cập nhật nền:", e));
}, UPDATE_INTERVAL_MS);

// ===== Cấu hình Middleware =====
app.use(cors({
  origin: process.env.REACT_APP_FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ===== Kết nối MongoDB =====
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Đã kết nối MongoDB"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));
}

// ===== Các Route API =====

// API danh sách tin tức (có phân trang)
app.get("/api/news", (req, res) => {
  try {
    const allArticles = cache.get("articles") || [];
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.max(1, parseInt(req.query.limit || "12"));
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const pagedArticles = allArticles.slice(startIndex, endIndex);
    
    res.json({
      total: allArticles.length,
      page,
      limit,
      articles: pagedArticles
    });
  } catch (error) {
    console.error("Lỗi API /api/news:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});

// API chi tiết bài viết
app.get("/api/news/:id", (req, res) => {
  try {
    const articleId = req.params.id;
    const article = cache.get(`article:${articleId}`);
    
    if (!article) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }
    
    res.json({ article });
  } catch (error) {
    console.error("Lỗi API /api/news/:id:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
});

// API kiểm tra sức khỏe
app.get("/", (req, res) => {
  res.send(`
    <h2>Backend Tin Tức BĐS 🚀</h2>
    <p>Server đang chạy ổn định</p>
    <p>Tổng số bài viết trong cache: ${cache.get("articles")?.length || 0}</p>
    <p><a href="/api/news">Xem danh sách tin tức</a></p>
  `);
});

// ===== Khởi động server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy trên cổng ${PORT}`);
  console.log(`📡 Truy cập: http://localhost:${PORT}`);
});