/**
 * Unified AI Service
 * Central AI service used by both Chatbox and Builder
 * Supports: Groq (Primary) → Gemini 2.0 (Fallback)
 */

const { chatCompletion, providers } = require('./multiAIProvider');

/**
 * Generate content for builder AI features
 * @param {string} prompt - Content generation prompt
 * @param {object} options - Generation options
 * @returns {Promise<string>} Generated content
 */
async function generateContent(prompt, options = {}) {
  const {
    temperature = 0.7,
    maxTokens = 500,
    systemPrompt = 'Bạn là chuyên gia viết content marketing cho landing pages. Tạo nội dung hấp dẫn, súc tích và chuyên nghiệp.'
  } = options;

  try {
    const result = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], { temperature, maxTokens });

    return result.response;
  } catch (error) {
    console.error('AI Content Generation Error:', error);
    throw error;
  }
}

/**
 * Analyze landing page with AI
 * @param {object} pageData - Page data to analyze
 * @returns {Promise<object>} Analysis result
 */
async function analyzePage(pageData) {
  const elements = pageData.elements || [];
  const sections = elements.filter(el => el.type === 'section');
  const forms = elements.filter(el => el.type === 'form');

  const prompt = `
Phân tích landing page này và đưa ra đánh giá:

Thông tin:
- Sections: ${sections.length}
- Forms: ${forms.length}
- Total elements: ${elements.length}

Đánh giá theo 4 tiêu chí (0-10):
1. CẤU TRÚC: Bố cục, tổ chức
2. NỘI DUNG: Text quality, CTAs
3. THIẾT KẾ: Colors, typography
4. CHUYỂN ĐỔI: Form placement, CTAs

Trả về JSON:
{
  "overall_score": 85,
  "scores": {"structure": 8, "content": 9, "design": 8, "conversion": 9},
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm yếu 1"],
  "suggestions": [{"type": "critical", "title": "Tiêu đề", "description": "Chi tiết"}]
}
`;

  try {
    const result = await chatCompletion([
      {
        role: 'system',
        content: 'Bạn là chuyên gia phân tích landing pages. Trả về JSON hợp lệ.'
      },
      { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 1000 });

    return JSON.parse(result.response);
  } catch (error) {
    console.error('AI Page Analysis Error:', error);
    // Return fallback analysis
    return getFallbackAnalysis(pageData);
  }
}

/**
 * Chat completion for support chatbox
 * @param {Array} messages - Conversation messages
 * @param {object} context - User context
 * @returns {Promise<object>} AI response with metadata
 */
async function chatWithAI(messages, context = {}) {
  try {
    const result = await chatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 1000
    });

    return {
      response: result.response,
      provider: result.provider,
      model: result.model,
      isFallback: result.fallback
    };
  } catch (error) {
    console.error('AI Chat Error:', error);
    throw error;
  }
}

/**
 * Get AI provider status
 * @returns {object} Provider status
 */
function getProviderStatus() {
  return {
    groq: {
      enabled: providers.groq.enabled,
      model: providers.groq.model,
      status: providers.groq.enabled ? 'active' : 'disabled'
    },
    gemini: {
      enabled: providers.gemini.enabled,
      model: providers.gemini.model,
      status: providers.gemini.enabled ? 'ready' : 'disabled'
    }
  };
}

/**
 * Fallback analysis when AI fails
 */
function getFallbackAnalysis(pageData) {
  const elements = pageData.elements || [];
  const sections = elements.filter(el => el.type === 'section');
  const forms = elements.filter(el => el.type === 'form');

  return {
    overall_score: 70,
    scores: {
      structure: Math.min(10, sections.length * 2),
      content: 7,
      design: 7,
      conversion: forms.length > 0 ? 8 : 5
    },
    strengths: [
      sections.length >= 3 && 'Có cấu trúc sections rõ ràng',
      forms.length > 0 && 'Có form thu thập leads'
    ].filter(Boolean),
    weaknesses: [
      sections.length < 3 && 'Cần thêm sections',
      forms.length === 0 && 'Thiếu form thu thập leads'
    ].filter(Boolean),
    suggestions: [
      {
        type: 'improvement',
        title: 'Thêm Form Thu Thập Leads',
        description: 'Landing page cần form để chuyển đổi visitors.'
      }
    ]
  };
}

module.exports = {
  generateContent,
  analyzePage,
  chatWithAI,
  getProviderStatus
};
