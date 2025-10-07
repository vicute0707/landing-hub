import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// === Axios instance chung cho tất cả API ===
const commonAPI = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// === Interceptor gửi token từ localStorage ===
commonAPI.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// === Tin tức ===
export const fetchNews = async (params = {}) => {
  const { page = 1, limit = 12 } = params;
  try {
    const res = await commonAPI.get('/news', { params: { page, limit } });
    return res.data;
  } catch (error) {
    console.error('Lỗi khi tải tin tức:', error);
    return { articles: [], total: 0, page: 1, limit };
  }
};

export const fetchArticle = async (id) => {
  try {
    const res = await commonAPI.get(`/news/${id}`);
    return res.data.article;
  } catch (error) {
    if (error.response?.status === 404) throw new Error('Bài viết không tồn tại');
    console.error('Lỗi khi tải bài viết:', error);
    throw error;
  }
};

// === Landing Page ===
export const cloneLanding = async ({ userId, templateId, name }) => {
  try {
    const res = await commonAPI.post('/landing/clone', { userId, templateId, name });
    return res.data;
  } catch (error) {
    console.error('Lỗi clone landing:', error);
    throw error;
  }
};

export const getMyLandingPages = async (userId) => {
  try {
    const res = await commonAPI.get(`/landing/my/${userId}`);
    // Backend trả { success, data }
    return res.data?.data || [];
  } catch (error) {
    console.error('Lỗi lấy kho landing:', error);
    return [];
  }
};

// === Auth ===
export const registerUser = async ({ name, email, password }) => {
  try {
    const res = await commonAPI.post('/auth/register', { name, email, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
};

export const loginUser = async ({ email, password }) => {
  try {
    const res = await commonAPI.post('/auth/login', { email, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('token');
};

// === Leads API ===
// Sử dụng commonAPI để có token auth
export const leadsAPI = commonAPI;

// === Reports API ===
// Backend phải có route GET /api/reports/:userId
export const fetchReport = async (userId) => {
  if (!userId) return { totalLeads: 0, leadStatus: [], lpStats: [] };
  try {
    const res = await commonAPI.get(`/reports/${userId}`);
    return res.data;
  } catch (error) {
    console.error('Lỗi tải báo cáo:', error);
    return { totalLeads: 0, leadStatus: [], lpStats: [] };
  }
};

// === Export default instance chung ===
export default commonAPI;
