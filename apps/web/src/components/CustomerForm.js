import React, { useState } from "react";
import api from "@landinghub/api"; // sử dụng api giống Leads.js

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
    } catch (err) {
      console.error("Submit form error:", err);
      alert("Gửi thông tin thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <div className="customer-form p-6 bg-white rounded shadow max-w-md mx-auto">
      {submitted && <p className="text-green-600 mb-4">Cảm ơn! Chúng tôi đã nhận thông tin của bạn.</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          name="name"
          placeholder="Tên"
          value={form.name}
          onChange={handleChange}
          className="border rounded p-2"
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="border rounded p-2"
          required
        />
        <input
          name="phone"
          placeholder="Số điện thoại"
          value={form.phone}
          onChange={handleChange}
          className="border rounded p-2"
        />
        <textarea
          name="notes"
          placeholder="Ghi chú"
          value={form.notes}
          onChange={handleChange}
          className="border rounded p-2 min-h-[80px]"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Gửi thông tin
        </button>
      </form>
    </div>
  );
};

export default CustomerForm;
