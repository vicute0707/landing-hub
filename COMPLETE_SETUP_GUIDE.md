# 🚀 Hướng Dẫn Setup Landing Hub Hoàn Chỉnh

## Tổng Quan Hệ Thống

Landing Hub sử dụng **AI thống nhất** cho cả Builder và Chatbox:
- **Groq** (Primary) - Miễn phí, siêu nhanh
- **Gemini 2.0 Flash** (Fallback) - Miễn phí, context 1M tokens

## 📋 Yêu Cầu

- Node.js 18+
- MongoDB (local hoặc Atlas)
- PNPM (hoặc npm)

## 🔧 Setup Từng Bước

### 1. Clone và Install

```bash
git clone <repository>
cd landing-hub

# Install dependencies
pnpm install
# Hoặc: npm install
```

### 2. Cấu Hình Backend (.env)

```bash
cd backend
cp .env.example .env
```

Mở `backend/.env` và cấu hình:

#### A. Database (Bắt buộc)
```bash
# MongoDB Local
MONGO_URI=mongodb://localhost:27017/landinghub

# Hoặc MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/landinghub
```

#### B. AI Configuration (Bắt buộc)

**Bước 1: Lấy Groq API Key**
1. Truy cập: https://console.groq.com/
2. Đăng ký/Đăng nhập (miễn phí)
3. Vào "API Keys" → Create API Key
4. Copy key (dạng: `gsk_...`)

**Bước 2: Lấy Gemini API Key**
1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập Google
3. Click "Get API key"
4. Copy key

**Bước 3: Thêm vào .env**
```bash
# AI Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

#### C. Email Notifications (Tùy chọn)

**Cho Gmail:**

1. **Bật 2-Step Verification**:
   - Vào https://myaccount.google.com/security
   - Bật "2-Step Verification"

2. **Tạo App Password**:
   - Vào https://myaccount.google.com/apppasswords
   - Chọn "Mail" và "Other (Custom name)"
   - Copy 16-ký tự app password

3. **Thêm vào .env**:
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password

# Admin email nhận thông báo
ADMIN_EMAIL=admin@yourdomain.com
```

#### D. Các Config Khác

```bash
# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_super_secret_key_here

# AWS S3 (cho upload files)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=landinghub-uploads

# VNPay (thanh toán Việt Nam)
VNPAY_TMN_CODE=your_code
VNPAY_HASH_SECRET=your_secret
```

### 3. Cấu Hình Frontend (.env)

```bash
cd apps/web
cp .env.example .env
```

Mở `apps/web/.env`:

```bash
# API URL
REACT_APP_API_URL=http://localhost:5000

# Environment
REACT_APP_ENV=development

# Feature Flags
REACT_APP_ENABLE_AI_FEATURES=true
REACT_APP_ENABLE_CHATBOX=true
```

**Lưu ý:** Không cần `REACT_APP_OPENAI_API_KEY` vì AI giờ chạy ở backend!

### 4. Khởi Động Ứng Dụng

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Kiểm tra logs:
```
✅ MongoDB connected
✅ Server running on port 5000
🚀 Using Groq: llama-3.3-70b-versatile
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm start
```

Trình duyệt mở tại: http://localhost:3000

## ✅ Test Hệ Thống

### 1. Test AI Provider

```bash
curl http://localhost:5000/api/chat/provider-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "groq": {
    "enabled": true,
    "model": "llama-3.3-70b-versatile",
    "status": "active"
  },
  "gemini": {
    "enabled": true,
    "model": "gemini-2.0-flash",
    "status": "ready"
  }
}
```

### 2. Test Chatbox

1. Đăng nhập vào app
2. Click icon chat ở góc phải dưới
3. Gửi tin nhắn test: "Hướng dẫn tạo landing page"
4. AI sẽ trả lời bằng Groq hoặc Gemini

### 3. Test Email (nếu đã config)

1. Gửi chat → Admin nhận email thông báo
2. Admin trả lời → User nhận email
3. Check logs: `✅ Email sent to admin@...`

## 📊 Admin Features

### 1. Admin Analytics Dashboard

URL: `/admin/analytics`

Xem:
- Chat volume trends
- Marketplace performance
- Top templates
- Real-time statistics

### 2. Admin Support Dashboard

URL: `/admin/support`

Quản lý:
- Tất cả chat conversations
- Assign chats cho admin
- Đánh dấu resolved
- Xem user context

## 🎯 Tính Năng AI

### Chatbox AI (Groq → Gemini)
- Trả lời tự động câu hỏi user
- Truy cập database thực (marketplace, templates, stats)
- Hướng dẫn sử dụng builder
- Gợi ý deployment, payment

### Builder AI (Groq → Gemini)
- Generate content (heading, paragraph, button text)
- Analyze landing page (structure, content, conversion)
- Layout suggestions
- Vietnamese language optimized

## 🔄 Luồng Hoạt Động

### Chat với AI
```
User gửi tin nhắn
    ↓
Backend nhận request
    ↓
Try Groq (primary)
    ↓ (nếu fail)
Try Gemini (fallback)
    ↓
Trả response cho user
    ↓
Lưu vào MongoDB
```

### Email Notifications
```
User tạo chat mới
    ↓
AI trả lời tự động
    ↓
[Nếu cần admin] → Email → Admin
    ↓
Admin vào dashboard → Reply
    ↓
Email notification → User
    ↓
Chat resolved → Confirmation email
```

## 🐛 Troubleshooting

### Lỗi: "No AI provider configured"
```bash
# Check .env có GROQ_API_KEY hoặc GEMINI_API_KEY
# Restart backend sau khi thêm key
```

### Lỗi: "ChatRoom validation failed: tags.0"
```bash
# Đã fix! Update code mới nhất:
git pull origin main
```

### Lỗi: Email không gửi
```bash
# Check SMTP config
# Đảm bảo đã bật App Password cho Gmail
# Test với: node -e "console.log(process.env.SMTP_USER)"
```

### Lỗi: Frontend không kết nối Backend
```bash
# Check REACT_APP_API_URL=http://localhost:5000
# Check backend đang chạy ở port 5000
# Check CORS trong backend/src/app.js
```

## 📚 Documentation

- **AI Setup**: [AI_PROVIDERS_SETUP.md](./AI_PROVIDERS_SETUP.md)
- **Groq Tutorial**: [GROQ_SETUP_TUTORIAL.md](./GROQ_SETUP_TUTORIAL.md)
- **Chatbox Guide**: [CHATBOX_SUPPORT_GUIDE.md](./CHATBOX_SUPPORT_GUIDE.md)
- **Research Docs**: [LLM_RESEARCH_DOCUMENTATION.md](./LLM_RESEARCH_DOCUMENTATION.md)

## 💡 Production Setup

### Environment Variables

**Backend Production .env:**
```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

MONGO_URI=mongodb+srv://...your_atlas_uri

GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...

SMTP_USER=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

JWT_SECRET=super_long_random_string_here

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

**Frontend Production .env:**
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENV=production
```

### Deploy Checklist

- [ ] MongoDB Atlas configured
- [ ] Groq API key added
- [ ] Gemini API key added (fallback)
- [ ] SMTP configured for emails
- [ ] JWT_SECRET changed from default
- [ ] CORS origins updated
- [ ] AWS S3 bucket created
- [ ] Domain DNS configured
- [ ] SSL certificate installed

## 🎉 Xong!

Giờ bạn có:
- ✅ AI chatbox với Groq + Gemini
- ✅ Email notifications tự động
- ✅ Admin analytics dashboard
- ✅ Builder AI features
- ✅ Unified AI configuration

**Enjoy coding!** 🚀
