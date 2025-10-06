import React, { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, MessageSquare, Wrench, ChevronDown, CheckCircle2, X } from "lucide-react";
import api from "@landinghub/api";
import Background from "../components/Background";
import "../styles/Support.css";

const faqsData = [
  {
    icon: <HelpCircle size={20} />,
    question: "Làm sao để tạo landing page nhanh chóng?",
    answer: "Chọn template, kéo thả các thành phần và xuất bản. Không cần kỹ năng code.",
  },
  {
    icon: <Wrench size={20} />,
    question: "Có thể tùy chỉnh layout không?",
    answer: "LandingHub cho phép chỉnh sửa mọi phần tử, màu sắc, font chữ và bố cục.",
  },
  {
    icon: <MessageSquare size={20} />,
    question: "Hỗ trợ kỹ thuật như thế nào?",
    answer: "Chúng tôi có chat trực tuyến và form liên hệ 24/7, đảm bảo phản hồi nhanh chóng.",
  },
];

const Support = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);

  const toggleFAQ = (index) => setOpenIndex(openIndex === index ? null : index);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return alert("Tên và Email là bắt buộc!");
    try {
      await api.post("/api/leads", { ...form, status: "new" });
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", notes: "" });
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      alert("Gửi thông tin thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <Background showShapes={false} fullWidth>
      <div className="support-container">
        {/* === HERO === */}
        <motion.section
          className="support-hero-animated"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="hero-inner">
            <h1>Trung tâm Hỗ trợ LandingHub</h1>
            <p>Giải đáp thắc mắc, hướng dẫn sử dụng và hỗ trợ kỹ thuật 24/7.</p>
          </div>
        </motion.section>

        {/* === FAQ === */}
        <motion.section
          className="faq-section"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2>Câu hỏi thường gặp</h2>
          <div className="faq-list">
            {faqsData.map((faq, idx) => (
              <div
                key={idx}
                className={`faq-item ${openIndex === idx ? "open" : ""}`}
                onClick={() => toggleFAQ(idx)}
              >
                <div className="faq-header">
                  <div className="faq-icon-wrapper">{faq.icon}</div>
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`faq-icon ${openIndex === idx ? "rotate" : ""}`}
                    size={18}
                  />
                </div>
                <div className="faq-body">{faq.answer}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* === CONTACT FORM === */}
        <motion.section
          className="contact-section"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="contact-container">
            <div className="contact-info">
              <h2>Liên hệ với đội ngũ hỗ trợ</h2>
              <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn mọi lúc, mọi nơi.</p>
              <ul className="contact-benefits">
                <li>💬 Phản hồi trong vòng 24h</li>
                <li>👩‍💻 Hỗ trợ kỹ thuật chuyên sâu</li>
                <li>⚡ Ưu tiên khách hàng Premium</li>
              </ul>
            </div>

            <div className="contact-form-wrapper">
              {submitted && (
                <div className="success-message">
                  <CheckCircle2 size={24} /> Đã gửi thành công! Cảm ơn bạn.
                </div>
              )}
              <form onSubmit={handleSubmit} className="contact-form-modern">
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Nội dung hỗ trợ</label>
                  <textarea name="notes" rows="4" value={form.notes} onChange={handleChange}></textarea>
                </div>
                <button type="submit" className="btn-submit-modern">Gửi yêu cầu hỗ trợ</button>
              </form>
            </div>
          </div>
        </motion.section>

        {/* === CTA === */}
        <motion.section
          className="cta-support"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="cta-inner">
            <h2>Luôn đồng hành cùng bạn</h2>
            <p>Đội ngũ LandingHub sẵn sàng hỗ trợ 24/7.</p>
            <button className="cta-btn" onClick={() => setChatOpen(true)}>Trò chuyện ngay</button>
          </div>
        </motion.section>

        {/* === CHAT MODAL === */}
        {chatOpen && (
          <div className="chat-modal">
            <div className="chat-box">
              <div className="chat-header">
                <h4>Hỗ trợ trực tuyến</h4>
                <button onClick={() => setChatOpen(false)} className="chat-close"><X size={18} /></button>
              </div>
              <div className="chat-body">
                <p>Xin chào 👋, tôi có thể giúp gì cho bạn?</p>
                <div className="chat-placeholder">[Giả lập khung chat hỗ trợ]</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Background>
  );
};

export default Support;
