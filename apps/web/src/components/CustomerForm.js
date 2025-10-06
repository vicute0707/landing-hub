import React, { useState } from "react";
import api from "@landinghub/api";
import Background from './Background';
import '../styles/CustomerForm.css';
import { CheckCircle2 } from "lucide-react"; // icon đẹp cho success

const CustomerForm = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email) {
      alert("Tên và Email là bắt buộc!");
      return;
    }

    try {
      await api.post("/api/leads", { ...form, status: "new" });
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", notes: "" });
      setTimeout(() => setSubmitted(false), 4000); // success message tự biến mất
    } catch (err) {
      console.error("Submit form error:", err);
      alert("Gửi thông tin thất bại. Vui lòng thử lại.");
    }
  };

  return (
     <Background>
    <div className="customer-form-page">
      <div className="customer-form-card">
        <h2>Liên hệ với chúng tôi</h2>
        {submitted && <p className="success-message">Cảm ơn! Chúng tôi đã nhận thông tin của bạn.</p>}
        <form onSubmit={handleSubmit}>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Tên" required />
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" required />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Số điện thoại" />
          <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Ghi chú" />
          <button type="submit">Gửi thông tin</button>
        </form>
      </div>
    </div>
  </Background>
  );
};

export default CustomerForm;
