import React, { useState } from "react";
import api from "@landinghub/api"; // axios instance
import Background from './Background';
import '../styles/CustomerForm.css';
import { CheckCircle2 } from "lucide-react";

const CustomerForm = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.phone) {
      alert("Tên, Email và Số điện thoại là bắt buộc!");
      return;
    }

    setLoading(true);

    try {
      // ✅ THAY ĐỔI NHỎ Ở ĐÂY: Thêm 'source' vào payload
      const leadDataToSend = {
        ...form,
        source: 'Website' 
      };

      // Gửi dữ liệu đã có 'source' lên server
      await api.post("/api/leads", leadDataToSend);

      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", notes: "" });
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error("Submit form error:", err.response?.data || err);
      alert(err.response?.data?.message || "Gửi thông tin thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <div className="customer-form-page">
        <div className="customer-form-card">
          <h2>Liên hệ với chúng tôi</h2>

          {submitted && (
            <p className="success-message">
              <CheckCircle2 className="success-icon" /> Cảm ơn! Chúng tôi đã nhận thông tin của bạn.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Tên" required />
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" required />
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="Số điện thoại" required />
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Ghi chú" />
            <button type="submit" disabled={loading}>{loading ? "Đang gửi..." : "Gửi thông tin"}</button>
          </form>
        </div>
      </div>
    </Background>
  );
};

export default CustomerForm;
