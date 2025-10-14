'use strict';
const express = require('express');
const OpenAI = require('openai');
require('dotenv').config();

const router = express.Router();

// --- Cấu hình Groq API ---
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// --- Hàm chọn model động ---
async function getActiveGroqModel() {
  try {
    const modelsList = await groq.models.list();
    const availableModels = modelsList.data.map(m => m.id);
    console.log('📜 Danh sách model khả dụng:', availableModels);

    // Ưu tiên theo thứ tự (nếu có model nào bị deprecate, sẽ chọn cái kế tiếp)
    const priorityModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
      'llama-guard-3-8b',
    ];

    const selected = priorityModels.find(m => availableModels.includes(m));

    return selected || availableModels[0]; // fallback: model đầu tiên trong danh sách
  } catch (err) {
    console.error('⚠️ Không thể lấy danh sách model:', err);
    // fallback cố định
    return 'llama-3.3-70b-versatile';
  }
}

// --- Route chính ---
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Vui lòng cung cấp nội dung tin nhắn.' });
    }

    // 🔍 Lấy model đang hoạt động
    const modelToUse = await getActiveGroqModel();
    console.log('🤖 Sử dụng model:', modelToUse);

    // --- Gọi Groq API ---
    const completion = await groq.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: 'Bạn là trợ lý AI thân thiện, giúp người dùng Việt Nam.' },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices?.[0]?.message?.content || '(Không có phản hồi từ AI)';
    res.status(200).json({ model: modelToUse, reply });

  } catch (error) {
    console.error('🔥 Lỗi từ Groq API:', error);

    // --- Xử lý lỗi model deprecate ---
    if (error.code === 'model_decommissioned') {
      return res.status(400).json({
        error: 'Model hiện tại đã ngừng hỗ trợ. Hãy thử gửi lại sau vài giây.',
      });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data?.error?.message || 'Lỗi từ Groq API.',
      });
    }

    res.status(500).json({ error: 'Đã xảy ra lỗi ở máy chủ khi gọi Groq API.' });
  }
});

module.exports = router;
