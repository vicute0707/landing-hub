import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LeadEditModal = ({ lead, onClose, onSave }) => {
  const [form, setForm] = useState(lead || {});

  useEffect(() => {
    setForm(lead || {});
  }, [lead]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <AnimatePresence>
      {lead && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-content"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            <h2 className="text-xl font-semibold mb-4">📝 Chỉnh sửa Lead</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label className="text-sm text-gray-600">Tên</label>
              <input
                name="name"
                value={form.name || ""}
                onChange={handleChange}
                className="border rounded p-2"
              />

              <label className="text-sm text-gray-600">Email</label>
              <input
                name="email"
                value={form.email || ""}
                onChange={handleChange}
                className="border rounded p-2"
              />

              <label className="text-sm text-gray-600">Số điện thoại</label>
              <input
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                className="border rounded p-2"
              />

              <label className="text-sm text-gray-600">Trạng thái</label>
              <select
                name="status"
                value={form.status || "new"}
                onChange={handleChange}
                className="border rounded p-2"
              >
                <option value="new">Mới</option>
                <option value="processing">Đang xử lý</option>
                <option value="converted">Chuyển đổi</option>
                <option value="lost">Mất</option>
              </select>

              <label className="text-sm text-gray-600">Ghi chú</label>
              <textarea
                name="notes"
                value={form.notes || ""}
                onChange={handleChange}
                className="border rounded p-2 min-h-[80px]"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeadEditModal;
