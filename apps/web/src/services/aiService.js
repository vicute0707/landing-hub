/**
 * AI Service for Landing Page Builder
 * Provides AI-powered features like content generation, page analysis, and suggestions
 * Now uses backend AI endpoints (powered by DeepSeek)
 */

import api from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Generate AI content for text/heading elements
 * @param {string} context - Context or topic for content
 * @param {string} type - Element type (heading, paragraph, button)
 * @param {object} options - Additional options (tone, length, style)
 * @returns {Promise<string>} Generated content
 */
export const generateAIContent = async (context, type, options = {}) => {
    const { tone = 'professional', length = 'medium', style = 'modern' } = options;

    try {
        // Call backend AI endpoint
        const response = await api.post('/api/ai/generate-content', {
            context,
            type,
            options: { tone, length, style }
        });

        if (response.data.success) {
            return response.data.content;
        } else {
            throw new Error('AI response không thành công');
        }
    } catch (error) {
        console.error('AI Content Generation Error:', error);

        // Fallback to local templates
        return getLocalAIContent(context, type, options);
    }
};

/**
 * Analyze landing page and provide AI suggestions
 * @param {object} pageData - Complete page data
 * @returns {Promise<object>} Analysis with scores and suggestions
 */
export const analyzePageWithAI = async (pageData) => {
    try {
        // Call backend AI endpoint
        const response = await api.post('/api/ai/analyze-page', {
            pageData
        });

        if (response.data.success) {
            return response.data.analysis;
        } else {
            throw new Error('AI analysis response không thành công');
        }
    } catch (error) {
        console.error('AI Page Analysis Error:', error);

        // Fallback to local analysis
        return getLocalPageAnalysis(pageData);
    }
};

/**
 * Get AI layout suggestions based on page type and industry
 * @param {string} pageType - Type of landing page (sales, lead-gen, event, etc.)
 * @param {string} industry - Industry/niche
 * @returns {Promise<Array>} Array of layout suggestions
 */
export const getAILayoutSuggestions = async (pageType, industry) => {
    try {
        // Call backend AI endpoint
        const response = await api.post('/api/ai/layout-suggestions', {
            pageType,
            industry
        });

        if (response.data.success) {
            return response.data.suggestions;
        } else {
            throw new Error('AI layout suggestions response không thành công');
        }
    } catch (error) {
        console.error('AI Layout Suggestions Error:', error);

        // Fallback to local suggestions
        return getLocalLayoutSuggestions(pageType, industry);
    }
};

// extractAllText removed - now handled by backend

/**
 * Fallback: Local AI content generation using templates
 */
const getLocalAIContent = (context, type, options) => {
    const templates = {
        heading: [
            `${context} - Giải Pháp Hoàn Hảo Cho Bạn`,
            `Khám Phá ${context} Ngay Hôm Nay`,
            `${context}: Nhanh, Hiệu Quả, Chuyên Nghiệp`
        ],
        paragraph: [
            `${context} mang đến cho bạn trải nghiệm tuyệt vời với chất lượng hàng đầu. Chúng tôi cam kết mang lại giá trị tốt nhất cho khách hàng với dịch vụ chuyên nghiệp và tận tâm.`,
            `Với ${context}, bạn sẽ nhận được sự hỗ trợ tốt nhất từ đội ngũ chuyên gia giàu kinh nghiệm. Hãy để chúng tôi đồng hành cùng bạn trên con đường thành công.`
        ],
        button: [
            'Bắt Đầu Ngay',
            'Tìm Hiểu Thêm',
            'Đăng Ký Miễn Phí',
            'Liên Hệ Ngay'
        ]
    };

    const items = templates[type] || templates.paragraph;
    return items[Math.floor(Math.random() * items.length)];
};

/**
 * Fallback: Local page analysis
 */
const getLocalPageAnalysis = (pageData) => {
    const elements = pageData.elements || [];
    const sections = elements.filter(el => el.type === 'section');
    const forms = elements.filter(el => el.type === 'form');
    const buttons = countElementsByType(elements, 'button');

    // Simple scoring algorithm
    const structureScore = Math.min(10, sections.length * 2); // Max 10
    const contentScore = Math.min(10, (buttons * 2 + forms.length * 3)); // CTAs + Forms
    const designScore = 7; // Default
    const conversionScore = Math.min(10, forms.length * 5); // Forms are key

    const overallScore = Math.round((structureScore + contentScore + designScore + conversionScore) / 4 * 10);

    return {
        overall_score: overallScore,
        scores: {
            structure: structureScore,
            content: contentScore,
            design: designScore,
            conversion: conversionScore
        },
        strengths: [
            sections.length >= 3 && 'Có cấu trúc sections rõ ràng',
            forms.length > 0 && 'Có form thu thập thông tin',
            buttons >= 3 && 'Có đủ call-to-action buttons'
        ].filter(Boolean),
        weaknesses: [
            sections.length < 3 && 'Cần thêm sections để tăng nội dung',
            forms.length === 0 && 'Thiếu form để thu thập leads',
            buttons < 3 && 'Cần thêm CTAs để tăng conversion'
        ].filter(Boolean),
        suggestions: [
            {
                type: 'critical',
                title: 'Thêm Form Thu Thập Leads',
                description: 'Landing page cần ít nhất 1 form để chuyển đổi visitors thành leads. Đặt form ở section cuối hoặc trong popup.'
            },
            {
                type: 'improvement',
                title: 'Tối Ưu Call-to-Action',
                description: 'Thêm buttons CTAs rõ ràng với text hấp dẫn: "Đăng ký ngay", "Nhận ưu đãi", "Tìm hiểu thêm"'
            },
            {
                type: 'improvement',
                title: 'Cải Thiện Visual Hierarchy',
                description: 'Sử dụng heading lớn, colors tương phản và spacing hợp lý để dẫn dắt người xem.'
            }
        ]
    };
};

/**
 * Fallback: Local layout suggestions
 */
const getLocalLayoutSuggestions = (pageType, industry) => {
    return [
        {
            name: 'Classic Sales Page',
            description: 'Layout truyền thống hiệu quả cao cho sales',
            sections: ['Hero + CTA', 'Features Grid', 'Benefits', 'Testimonials', 'Pricing', 'FAQ', 'Final CTA'],
            colorScheme: ['#2563eb', '#ffffff', '#f3f4f6'],
            keyElements: ['Hero image', 'Trust badges', 'Social proof', 'Pricing table', 'Contact form']
        },
        {
            name: 'Modern Lead Generation',
            description: 'Thu thập leads hiệu quả với form nổi bật',
            sections: ['Hero + Form', 'Problem/Solution', 'How It Works', 'Success Stories', 'Final CTA'],
            colorScheme: ['#10b981', '#ffffff', '#ecfdf5'],
            keyElements: ['Above-fold form', 'Value proposition', 'Step-by-step guide', 'Testimonials']
        },
        {
            name: 'Product Launch',
            description: 'Giới thiệu sản phẩm mới với storytelling',
            sections: ['Hero Video', 'Product Showcase', 'Key Features', 'Demo/Preview', 'Early Access Form'],
            colorScheme: ['#8b5cf6', '#ffffff', '#faf5ff'],
            keyElements: ['Product images', 'Feature highlights', 'Countdown timer', 'Pre-order form']
        }
    ];
};

/**
 * Helper: Count elements by type recursively
 */
const countElementsByType = (elements, type) => {
    let count = 0;
    const countRecursive = (els) => {
        els.forEach(el => {
            if (el.type === type) count++;
            if (el.children) countRecursive(el.children);
        });
    };
    countRecursive(elements);
    return count;
};

export default {
    generateAIContent,
    analyzePageWithAI,
    getAILayoutSuggestions
};
