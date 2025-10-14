import React, { useState } from "react";
import api from "@landinghub/api";
import Background from "../components/Background";
import { CheckCircle2 } from "lucide-react";
import "../styles/Contact.css";

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    notes: "",
    newsletter: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.name || !form.email ) {
    alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
    return;
  }
  try {
    // Chuẩn hóa payload: Thêm 'source', bỏ 'status'
    const leadDataToSend = { ...form, source: 'Contact Page' };
    delete leadDataToSend.status; // Xóa key không cần thiết

    await api.post("/api/leads", leadDataToSend);
    setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Gửi thông tin thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false); // Dừng loading dù thành công hay thất bại
    }
  };
  return (
    <Background showShapes={false} fullWidth={true}>
      <div className="contact-page">

        {/* Banner */}
        <section className="contact-banner">
          <h1>Liên hệ với chúng tôi</h1>
          <p>
            Sẵn sàng hỗ trợ bạn 24/7 với đội ngũ chuyên gia giàu kinh nghiệm.<br/>
            Hãy để chúng tôi giúp bạn phát triển doanh nghiệp.
          </p>
        </section>

        {/* Contact Cards */}
        <section className="contact-cards-section">
          <div className="cards-grid">
            <div className="contact-card sales">
              <div className="card-icon">💼</div>
              <h4>Tư vấn bán hàng</h4>
              <p>Tìm hiểu gói dịch vụ phù hợp với doanh nghiệp của bạn</p>
              <div className="contact-info">
                <strong>📞 1900-1111</strong><br/>
                <strong>📧 sales@LandingHub.vn</strong>
              </div>
              <a href="mailto:sales@LandingHub.vn" className="btn">Liên hệ ngay</a>
            </div>

            <div className="contact-card support">
              <div className="card-icon">🛠️</div>
              <h4>Hỗ trợ kỹ thuật</h4>
              <p>Giải đáp thắc mắc và hỗ trợ sử dụng sản phẩm</p>
              <div className="contact-info">
                <strong>📞 1900-2222</strong><br/>
                <strong>📧 support@LandingHub.vn</strong>
              </div>
              <a href="mailto:support@LandingHub.vn" className="btn">Cần hỗ trợ</a>
            </div>

            <div className="contact-card partner">
              <div className="card-icon">🤝</div>
              <h4>Hợp tác đối tác</h4>
              <p>Cơ hội hợp tác và phát triển cùng LandingHub</p>
              <div className="contact-info">
                <strong>📞 1900-3333</strong><br/>
                <strong>📧 partner@LandingHub.vn</strong>
              </div>
              <a href="mailto:partner@LandingHub.vn" className="btn">Hợp tác</a>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="contact-form-section">
          <div className="form-card">
            {submitted && (
              <div className="success-message">
                <CheckCircle2 size={24} /> Cảm ơn! Chúng tôi đã nhận thông tin của bạn.
              </div>
            )}
            <h2 className="form-title">Gửi tin nhắn cho chúng tôi</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Họ và tên" required />
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" required />
              <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="Số điện thoại" />
              <input type="text" name="company" value={form.company} onChange={handleChange} placeholder="Tên công ty" />
              <select name="subject" value={form.subject} onChange={handleChange} >
                <option value="">Chọn chủ đề...</option>
                <option value="sales">Tư vấn bán hàng</option>
                <option value="support">Hỗ trợ kỹ thuật</option>
                <option value="partnership">Hợp tác đối tác</option>
                <option value="other">Khác</option>
              </select>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Nội dung tin nhắn" />
              <div className="form-check">
                <input type="checkbox" name="newsletter" checked={form.newsletter} onChange={handleChange} id="newsletter" />
                <label htmlFor="newsletter">Tôi muốn nhận thông tin về sản phẩm và khuyến mãi</label>
              </div>
              <button type="submit" className="btn-submit">Gửi tin nhắn</button>
            </form>
          </div>
        </section>

        {/* Company Info */}
        <section className="contact-info-section">
          <div className="info-grid">
            <div className="info-card">
              <div className="icon">📍</div>
              <h4>Địa chỉ văn phòng</h4>
              <p>
                Tầng 15, Tòa nhà ABC<br/>
                123 Đường Nguyễn Huệ<br/>
                Quận 1, TP. Hồ Chí Minh<br/>
                Việt Nam
              </p>
            </div>
            <div className="info-card">
              <div className="icon">📞</div>
              <h4>Điện thoại</h4>
              <p>
                Hotline: 1900-xxxx<br/>
                Sales: 1900-1111<br/>
                Support: 1900-2222<br/>
                Thời gian: 8h-22h (T2-CN)
              </p>
            </div>
            <div className="info-card">
              <div className="icon">📧</div>
              <h4>Email</h4>
              <p>
                Chung: info@LandingHub.vn<br/>
                Bán hàng: sales@LandingHub.vn<br/>
                Hỗ trợ: support@LandingHub.vn<br/>
                Đối tác: partner@LandingHub.vn
              </p>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="map-section">
          <iframe
            title="Office Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.688992317727!2d106.7038817146212!3d10.776885292324133!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f30c4a7dbdf%3A0xd019df0c1e9f1e0d!2sNguyen%20Hue%20Street%2C%20District%201%2C%20Ho%20Chi%20Minh%2C%20Vietnam!5e0!3m2!1sen!2sus!4v1696597290000!5m2!1sen!2sus"
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: "12px" }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2>Câu hỏi thường gặp</h2>
          <div className="faq-buttons">
            <a href="/faq#general" className="btn-outline-primary">Câu hỏi chung</a>
            <a href="/faq#pricing" className="btn-outline-success">Về giá cả</a>
            <a href="/faq#technical" className="btn-outline-warning">Kỹ thuật</a>
            <a href="/faq#support" className="btn-outline-info">Hỗ trợ</a>
          </div>
        </section>

        {/* CTA */}
        <section className="contact-cta">
          <h2>Sẵn sàng bắt đầu?</h2>
          <p>Dùng thử LandingHub miễn phí 14 ngày ngay hôm nay.</p>
          <a href="/dang-ky" className="btn-cta">Dùng thử miễn phí</a>
        </section>

      </div>
    </Background>
  );
};

export default Contact;
