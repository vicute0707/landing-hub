import api from './api'; // Base URL đã được config trong @landinghub/api
export const userApi = {
    // Lấy danh sách tất cả user (dành cho admin)
    getAll: async () => {
        try {
            return await api.get('/api/admin/users');
        } catch (err) {
            console.error('userApi.getAll error:', err.response || err);
            throw err;
        }
    },

    // Tạo user mới
    create: async (data) => {
        try {
            return await api.post('/api/admin/users', data);
        } catch (err) {
            console.error('userApi.create error:', err.response || err);
            throw err;
        }
    },

    // Cập nhật thông tin user
    update: async (id, data) => {
        try {
            return await api.put(`/api/admin/users/${id}`, data);
        } catch (err) {
            console.error('userApi.update error:', err.response || err);
            throw err;
        }
    },

    // Xóa user
    remove: async (id) => {
        try {
            return await api.delete(`/api/admin/users/${id}`);
        } catch (err) {
            console.error('userApi.remove error:', err.response || err);
            throw err;
        }
    },

    // 🔒 MỚI: Khóa hoặc mở khóa tài khoản (toggle disable)
    toggleDisable: async (id) => {
        try {
            return await api.patch(`/api/admin/users/${id}/toggle-disable`);
            // Hoặc nếu backend dùng POST/PUT thì đổi thành:
            // return await api.post(`/api/admin/users/${id}/toggle-disable`);
        } catch (err) {
            console.error('userApi.toggleDisable error:', err.response || err);
            throw err;
        }
    },
};