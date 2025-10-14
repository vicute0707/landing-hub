// LeadEditModal.js

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@landinghub/api"; // Giả sử bạn có file api config

const LeadEditModal = ({ lead, onClose, onSave, onAddActivity }) => {
  const [form, setForm] = useState(lead || {});
  // === STATE MỚI ĐỂ QUẢN LÝ VIỆC THÊM ACTIVITY ===
  const [newActivityContent, setNewActivityContent] = useState("");
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  // ===============================================

  useEffect(() => {
    setForm(lead || {});
  }, [lead]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainFormSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  // === HÀM MỚI ĐỂ XỬ LÝ VIỆC THÊM ACTIVITY ===
  const handleAddNewActivity = async (e) => {
    e.preventDefault();
    if (!newActivityContent.trim()) return;
    setIsAddingActivity(true);

    const newActivity = {
      type: 'NOTE', // Mặc định là NOTE, có thể thêm dropdown để chọn
      content: newActivityContent,
    };

    try {
      // Gọi prop mới được truyền từ cha xuống
      await onAddActivity(lead._id, newActivity);
      setNewActivityContent(""); // Xóa nội dung trong ô input
    } catch (error) {
      console.error("Failed to add activity", error);
      alert("Thêm hoạt động thất bại!");
    } finally {
      setIsAddingActivity(false);
    }
  };
  // ===============================================

  if (!lead) return null;

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="modal-content" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
          <div className="modal-header">
            <h2>📝 Chỉnh sửa Lead: {lead.name}</h2>
            <button onClick={onClose} className="close-button">&times;</button>
          </div>
          
          <div className="modal-body">
            {/* Form chỉnh sửa thông tin chính */}
            <form id="mainLeadForm" onSubmit={handleMainFormSubmit} className="main-info-form">
              <div className="form-field">
                <label>Tên</label>
                <input name="name" value={form.name || ""} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input name="email" value={form.email || ""} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label>Số điện thoại</label>
                <input name="phone" value={form.phone || ""} onChange={handleChange} />
              </div>
              <div className="form-field">
                 <label>Trạng thái</label>
                 <select name="status" value={form.status || "new"} onChange={handleChange}>
                   <option value="new">Mới</option>
                   <option value="processing">Đang xử lý</option>
                   <option value="converted">Chuyển đổi</option>
                   <option value="lost">Mất</option>
                 </select>
              </div>
            </form>

            {/* === PHẦN NÂNG CẤP: LỊCH SỬ TƯƠNG TÁC === */}
            <div className="activities-section">
              <h3>Lịch sử tương tác</h3>
              <form onSubmit={handleAddNewActivity} className="add-activity-form">
                <textarea
                  value={newActivityContent}
                  onChange={(e) => setNewActivityContent(e.target.value)}
                  placeholder="Thêm ghi chú, nhật ký cuộc gọi..."
                  rows="3"
                  disabled={isAddingActivity}
                />
                <button type="submit" disabled={isAddingActivity}>
                  {isAddingActivity ? "Đang lưu..." : "Lưu ghi chú"}
                </button>
              </form>

              <div className="activity-list">
                {form.activities && form.activities.length > 0 ? (
                  [...form.activities].reverse().map((act) => (
                    <div key={act._id || Math.random()} className="activity-item">
                      <div className="activity-header">
                        <strong>{act.type}</strong>
                        <span>{new Date(act.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <p>{act.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="no-activity">Chưa có hoạt động nào.</p>
                )}
              </div>
            </div>
            {/* ======================================= */}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="cancel-btn">Hủy</button>
            <button type="submit" form="mainLeadForm" className="save-btn">Lưu thay đổi</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LeadEditModal;