import React from "react";
import { Link } from "react-router-dom";
import Background from "../components/Background";
import heroImg from "../assets/hero.png";
import feature1 from "../assets/feature1.png";
import feature2 from "../assets/feature2.png";
import feature3 from "../assets/feature3.png";
import "../styles/GioiThieu.css";

const GioiThieu = () => {
  return (
    <Background showShapes={false} fullWidth={true}>
      <div className="gioithieu-page">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-text">
            <h1>LandingHub – Nền tảng tạo Landing Page cho Nhà Môi Giới</h1>
            <p>
              Giúp bạn xây dựng trang giới thiệu dự án, thu hút khách hàng và tăng chuyển đổi —
              mà không cần biết lập trình.
            </p>
            <Link to="/customerForm" className="cta-button">
              Tạo Landing Page của bạn
            </Link>
          </div>
          <div className="hero-image">
            <img src={heroImg} alt="Landing illustration" />
          </div>
        </section>

        {/* About Section */}
        <section className="about-section">
          <h2>Về LandingHub</h2>
          <p className="about-intro">
            LandingHub là công cụ giúp các <strong>nhà môi giới BĐS</strong> dễ dàng tạo trang
            đích chuyên nghiệp cho từng dự án, tối ưu SEO và khả năng chốt khách.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <img src={feature1} alt="Tính năng 1" />
              <h3>Dễ sử dụng</h3>
              <p>Kéo thả trực quan, không cần kỹ năng lập trình.</p>
            </div>
            <div className="feature-card">
              <img src={feature2} alt="Tính năng 2" />
              <h3>Tùy biến cao</h3>
              <p>Hàng trăm template sẵn có, dễ chỉnh màu và bố cục.</p>
            </div>
            <div className="feature-card">
              <img src={feature3} alt="Tính năng 3" />
              <h3>Quản lý hiệu quả</h3>
              <p>Theo dõi lượt truy cập, khách hàng tiềm năng ngay trong hệ thống.</p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="testimonial-section">
          <h2>Nhà môi giới nói gì về chúng tôi</h2>
          <div className="testimonial-cards">
            <div className="testimonial-card">
              <p>
                “LandingHub giúp tôi có trang giới thiệu dự án cực kỳ chuyên nghiệp. Khách hàng
                tin tưởng hơn hẳn!”
              </p>
              <span>- Nguyễn Văn A, Môi giới Quận 7</span>
            </div>
            <div className="testimonial-card">
              <p>
                “Tôi chỉ mất chưa tới 1 giờ để hoàn thiện landing page cho dự án mới. Quá tiện!”
              </p>
              <span>- Trần Thị B, Freelancer BĐS</span>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <h2>Gia nhập cộng đồng nhà môi giới hiện đại</h2>
          <p>
            Bắt đầu tạo landing page đầu tiên của bạn với LandingHub —
            công cụ đồng hành cùng mọi chiến dịch bán hàng.
          </p>
          <Link to="/customerForm" className="cta-button">
            Liên hệ tư vấn miễn phí
          </Link>
        </section>
      </div>
    </Background>
  );
};

export default GioiThieu;
