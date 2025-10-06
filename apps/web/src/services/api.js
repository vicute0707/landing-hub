// frontend/src/services/api.js
import axios from 'axios';

// Tạo một Axios instance chung với các cấu hình cơ bản
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const commonAPI = axios.create({
  baseURL: `${API_BASE}/api`, // Base URL cho các endpoint API
  headers: {
    'Content-Type': 'application/json',
  },
  // Có thể thêm các cấu hình khác như timeout tại đây
});

/**
 * Lấy danh sách tin tức với phân trang
 * @param {Object} params - Tham số tìm kiếm
 * @param {number} params.page - Trang hiện tại
 * @param {number} params.limit - Số bài mỗi trang
 */
export const fetchNews = async (params = {}) => {
  try {
    const { page = 1, limit = 12 } = params;
    const response = await commonAPI.get('/news', { // Sử dụng instance 'commonAPI'
      params: { page, limit } // Axios tự động xử lý query string
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi tải tin tức:', error);
    // Trả về dữ liệu mặc định nếu có lỗi
    return { articles: [], total: 0, page: 1, limit };
  }
};

/**
 * Lấy chi tiết một bài viết theo ID
 * @param {string} id - ID bài viết
 */
export const fetchArticle = async (id) => {
  try {
    const response = await commonAPI.get(`/news/${id}`); // Sử dụng instance 'commonAPI'
    return response.data.article;
  } catch (error) {
    console.error('Lỗi khi tải bài viết:', error);
    // Bạn có thể xử lý các mã lỗi cụ thể ở đây (như 404)
    if (error.response?.status === 404) {
      throw new Error('Bài viết không tồn tại');
    }
    throw error; // Ném lỗi để component xử lý
  }
};

// Giữ nguyên leadsAPI nếu nó được dùng ở nơi khác
// Nếu tất cả endpoint đều dùng chung baseURL '/api', có thể dùng commonAPI thay thế
export const leadsAPI = axios.create({
  baseURL: `${API_BASE}/api`, // Đảm bảo tính đồng bộ. Nếu leads dùng baseURL khác, hãy giữ nguyên.
});

// Xuất commonAPI để có thể dùng ở những nơi khác nếu cần
export default commonAPI;