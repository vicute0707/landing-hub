"use client"

import { useState } from "react"
import "../styles/Payments.css"

export default function Payment() {
  const [currentModal, setCurrentModal] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [hoveredPlan, setHoveredPlan] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState("1")
  const [upgradeOption, setUpgradeOption] = useState("auto")
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  })

  const plans = [
    {
      id: "starter",
      name: "Starter",
      icon: "⚡",
      price: 0,
      description: "Dành cho những người mới sử dụng LadiPage",
      memberLimit: "01",
      features: [
        "Tạo 10 Landing page",
        "0 Tên miền tùy chỉnh",
        "1.000 Lượt truy cập/tháng",
        "1 Tích hợp tài khoản liên kết",
        "0 Đơn hàng/tháng",
        "5 Sản phẩm",
        "Có Xác nhận tự động đơn hàng chuyên khoản",
        "100 Khách hàng",
        "250 Điểm tương tác với khách hàng",
        "1 Email người gửi",
        "1 Facebook Page tích hợp",
        "0 Zalo OA tích hợp",
        "50MB Dung lượng lưu trữ File Upload",
      ],
      buttonText: "Truy cập ngay",
    },
    {
      id: "core",
      name: "Core",
      icon: "👥",
      price: 3360000,
      description: "Dành cho cá nhân, nhà quảng cáo",
      memberLimit: "01",
      features: [
        "Tạo 100 Landing page",
        "10 Tên miền tùy chỉnh",
        "100.000 Lượt truy cập/tháng",
        "10 Tích hợp tài khoản liên kết",
        "100 Đơn hàng/tháng",
        "10 Sản phẩm",
        "Có Xác nhận tự động đơn hàng chuyên khoản",
        "10.000 Khách hàng",
        "1.000 Điểm tương tác với khách hàng",
        "3 Email người gửi",
        "3 Facebook Page tích hợp",
        "1 Zalo OA tích hợp",
        "10GB Dung lượng lưu trữ File Upload",
      ],
      buttonText: "Nâng cấp Core - Tặng 3 tháng",
    },
    {
      id: "grow",
      name: "Grow",
      icon: "🏢",
      price: 1800000,
      originalPrice: 5400000,
      description: "Dành cho doanh nghiệp đang phát triển. Áp dụng khi mua 03 thành viên (5.400.000đ/năm)",
      memberLimit: "03",
      features: [
        "Tạo 1.000 Landing page",
        "50 Tên miền tùy chỉnh",
        "500.000 Lượt truy cập/tháng",
        "30 Tích hợp tài khoản liên kết",
        "250 Đơn hàng/tháng",
        "50 Sản phẩm",
        "Có Xác nhận tự động đơn hàng chuyên khoản",
        "25.000 Khách hàng",
        "3.000 Điểm tương tác với khách hàng",
        "3 Email người gửi",
        "3 Facebook Page tích hợp",
        "1 Zalo OA tích hợp",
        "50GB Dung lượng lưu trữ File Upload",
      ],
      isRecommended: true, // moved recommended badge to Grow package
      buttonText: "Nâng cấp Grow - Tặng 3 tháng",
    },
    {
      id: "max",
      name: "Max",
      icon: "👑",
      price: 1440000,
      originalPrice: 7200000,
      description: "Gói cao cấp không giới hạn tính năng. Áp dụng khi mua 05 thành viên (7.200.000đ/năm)",
      memberLimit: "05",
      features: [
        "Tạo không giới hạn Landing page",
        "300 Tên miền tùy chỉnh",
        "Không giới hạn Lượt truy cập/tháng",
        "Không giới hạn Tích hợp tài khoản liên kết",
        "500 Đơn hàng/tháng",
        "300 Sản phẩm",
        "Có Xác nhận tự động đơn hàng chuyên khoản",
        "50.000 Khách hàng",
        "10.000 Điểm tương tác với khách hàng",
        "3 Email người gửi",
        "3 Facebook Page tích hợp",
        "1 Zalo OA tích hợp",
        "100GB Dung lượng lưu trữ File Upload",
      ],
      buttonText: "Nâng cấp Max - Tặng 3 tháng",
    },
  ]

  const openModal = (step, plan) => {
    if (plan) setSelectedPlan(plan)
    setCurrentModal(step)
  }

  const closeModal = () => {
    setCurrentModal(null)
    setSelectedPlan(null)
  }

  const formatPrice = (price) => {
    return price.toLocaleString("vi-VN") + "đ"
  }

  const getPaymentAmount = () => {
    if (!selectedPlan) return 0
    const multiplier = Number.parseInt(selectedDuration)
    return selectedPlan.price * multiplier
  }

  const DurationModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content duration-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>
          ×
        </button>
        <div className="modal-header">
          <div className="progress-bar">
            <div className="progress-step active"></div>
            <div className="progress-step"></div>
            <div className="progress-step"></div>
          </div>
          <h2>Click chọn thời hạn của gói</h2>
        </div>
        <div className="duration-options">
          {["1", "2", "3"].map((year) => (
            <button
              key={year}
              className={`duration-btn ${selectedDuration === year ? "active" : ""}`}
              onClick={() => setSelectedDuration(year)}
            >
              {year} Năm
            </button>
          ))}
        </div>
        <p className="duration-note">
          *Chỉ còn 1 bước cuối cùng để hoàn tất quá trình,
          <br />
          bấm "Tiếp tục" ngay!
        </p>
        <button className="btn-continue" onClick={() => setCurrentModal("info")}>
          Tiếp tục →
        </button>
      </div>
    </div>
  )

  const InfoModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>
          ×
        </button>
        <div className="modal-header">
          <div className="progress-bar">
            <div className="progress-step active"></div>
            <div className="progress-step active"></div>
            <div className="progress-step"></div>
          </div>
          <div className="promo-badges">
            <span className="promo-badge orange">🔥 Tháng 9 "Đu" Deal Đỉnh - Mua 1 Rinh 3</span>
            <span className="promo-badge red">MUA 1 NĂM TẶNG 3 THÁNG</span>
          </div>
          <h2>Điền thông tin nhận ưu đãi ngay</h2>
        </div>
        <div className="form-group">
          <input
            type="text"
            placeholder="Phạm Nguyễn Tấn Kiệt"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="0822345503"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <p className="email-note">
            Vui lòng điền email tài khoản LadiPage bạn cần nâng cấp/gia hạn,{" "}
            <span className="link">nếu chưa có hãy đăng ký tại đây!</span>
          </p>
          <input
            type="email"
            placeholder="ptankiet1712@gmail.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="upgrade-options">
          <p className="option-title">Bạn muốn Nâng cấp/Gia hạn gói theo hình thức nào?</p>
          <label className="radio-option">
            <input
              type="radio"
              name="upgrade"
              value="auto"
              checked={upgradeOption === "auto"}
              onChange={(e) => setUpgradeOption(e.target.value)}
            />
            <span>Tự chuyển khoản luôn → Tự động tăng thêm 3 tháng</span>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="upgrade"
              value="manual"
              checked={upgradeOption === "manual"}
              onChange={(e) => setUpgradeOption(e.target.value)}
            />
            <span>Đội Chuyên viên LadiPage tư vấn thêm</span>
          </label>
        </div>
        <button className="btn-continue" onClick={() => setCurrentModal("payment")}>
          Tiếp tục →
        </button>
      </div>
    </div>
  )

  const PaymentModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>
          ×
        </button>
        <div className="modal-header">
          <h2>Nâng cấp/Gia hạn tài khoản LadiPage {selectedPlan?.name.toUpperCase()}</h2>
        </div>
        <div className="payment-content">
          <div className="qr-section">
            <h3>Quét mã QR thanh toán</h3>
            <div className="qr-container">
              <div className="qr-code">
                <div className="qr-placeholder">QR Code</div>
              </div>
              <p>Mở app ngân hàng hoặc ví điện tử của bạn sau đó chọn quét mã QR để thực hiện thanh toán.</p>
            </div>
          </div>
          <div className="bank-section">
            <h3>Chuyển khoản thủ công theo thông tin</h3>
            <div className="bank-logo">
              <span className="techcombank-logo">TECHCOMBANK</span>
            </div>
            <div className="bank-details">
              <div className="detail-row">
                <span>Ngân hàng</span>
                <span>Ngân hàng TMCP Kỹ thương Việt Nam</span>
              </div>
              <div className="detail-row">
                <span>Thụ hưởng</span>
                <span>CTCP CN LADIPAGE VIET NAM</span>
              </div>
              <div className="detail-row">
                <span>Số tài khoản</span>
                <span>19036184902015</span>
              </div>
              <div className="detail-row">
                <span>Số tiền</span>
                <span className="amount">{formatPrice(getPaymentAmount())}</span>
              </div>
              <div className="detail-row">
                <span>Nội dung CK</span>
                <span>CAMPTUCKptankiet1712gmail.com</span>
              </div>
            </div>
            <div className="payment-note">
              <strong>Lưu ý:</strong> Vui lòng ghi nguyên nội dung <strong>CAMPTUCKptankiet1712gmail.com</strong> để xác
              nhận thanh toán tự động.
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="payment-panel">
      <div className="panel-header">
        <div className="recommended-badge">Khuyến dùng</div>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card ${plan.isRecommended ? "recommended" : ""} ${hoveredPlan === plan.id ? "hovered" : ""}`}
            onMouseEnter={() => setHoveredPlan(plan.id)} // Added hover animation
            onMouseLeave={() => setHoveredPlan(null)}
          >
            {plan.isRecommended && <div className="plan-badge">Khuyến dùng</div>}

            <div className="plan-header">
              <div className="plan-icon">{plan.icon}</div>
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>

              <div className="plan-pricing">
                {plan.originalPrice && <div className="original-price">{formatPrice(plan.originalPrice)}</div>}
                <div className="current-price">{plan.price === 0 ? "0đ" : formatPrice(plan.price)}</div>
                <div className="price-period">Người/năm</div>
              </div>

              <button
                className={`plan-button ${plan.id === "starter" ? "starter-btn" : "premium-btn"}`}
                onClick={() => {
                  if (plan.id === "starter") {
                    alert("Truy cập gói Starter")
                  } else {
                    openModal("duration", plan)
                  }
                }}
              >
                {plan.buttonText}
              </button>
            </div>

            <div className="plan-details">
              <div className="member-count">
                <span>Số lượng thành viên</span>
                <span className="count">{plan.memberLimit}</span>
              </div>

              <div className="plan-features">
                <h4>Các giới hạn của gói</h4>
                <ul>
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <span className="check-icon">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {currentModal === "duration" && <DurationModal />}
      {currentModal === "info" && <InfoModal />}
      {currentModal === "payment" && <PaymentModal />}
    </div>
  )
}
