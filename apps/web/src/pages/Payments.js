"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
    // Mặc định người dùng đang dùng Free
    setSelectedPlan(plans[0])
  }, [])

  const plans = [
    {
      id: "free",
      name: "Free",
      icon: "⚡",
      price: 0,
      description: "Dành cho người mới bắt đầu",
      memberLimit: "01",
      features: [
        "Tạo 5 Landing page",
        "0 Tên miền tùy chỉnh",
        "1.000 Lượt truy cập/tháng",
        "1 Tích hợp tài khoản liên kết",
        "0 Đơn hàng/tháng",
      ],
      buttonText: "Đang dùng",
    },
    {
      id: "premium",
      name: "Premium",
      icon: "👑",
      price: 1800000,
      description: "Dành cho cá nhân/doanh nghiệp muốn nâng cấp",
      memberLimit: "03",
      features: [
        "Tạo 100 Landing page",
        "10 Tên miền tùy chỉnh",
        "100.000 Lượt truy cập/tháng",
        "10 Tích hợp tài khoản liên kết",
        "100 Đơn hàng/tháng",
      ],
      buttonText: "Nâng cấp Premium",
      isRecommended: true,
    },  
  ]

  const openModal = (step, plan) => {
    if (plan) setSelectedPlan(plan)
    setCurrentModal(step)
  }

  const closeModal = () => {
    setCurrentModal(null)
  }

  const formatPrice = (price) => price.toLocaleString("vi-VN") + "đ"

  const getPaymentAmount = () => {
    if (!selectedPlan) return 0
    const multiplier = Number.parseInt(selectedDuration)
    return selectedPlan.price * multiplier
  }

  const handlePayment = async () => {
  if (!formData.name || !formData.phone || !formData.email) {
    alert("Vui lòng điền đầy đủ thông tin khách hàng!")
    return
  }

  try {
    const res = await fetch("http://localhost:5000/api/payment/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: getPaymentAmount(),
        planId: selectedPlan?.id,
        duration: selectedDuration,
        customer: formData,
      }),
    })

    const data = await res.json()
    if (data.paymentUrl) {
      // Redirect tới VNPay sandbox
      window.location.href = data.paymentUrl
    } else {
      alert("Không tạo được giao dịch!")
    }
  } catch (err) {
    console.error(err)
    alert("Lỗi khi tạo giao dịch!")
  }
}


  const DurationModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content duration-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal}>×</button>
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
        <button className="modal-close" onClick={closeModal}>×</button>
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
        <button className="modal-close" onClick={closeModal}>×</button>
        <div className="modal-header">
          <h2>Xác nhận thanh toán gói {selectedPlan?.name}</h2>
        </div>
        <div className="payment-summary">
          <p><strong>Khách hàng:</strong> {formData.name}</p>
          <p><strong>Email:</strong> {formData.email}</p>
          <p><strong>Số điện thoại:</strong> {formData.phone}</p>
          <p><strong>Số tiền:</strong> {formatPrice(getPaymentAmount())}</p>
        </div>
        <button className="btn-pay" onClick={handlePayment}>
          Thanh toán qua VNPay →
        </button>
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
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            {plan.isRecommended && <div className="plan-badge">Khuyến dùng</div>}
            <div className="plan-header">
              <div className="plan-icon">{plan.icon}</div>
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <div className="plan-pricing">
                {plan.originalPrice && <div className="original-price">{formatPrice(plan.originalPrice)}</div>}
                <div className="current-price">{formatPrice(plan.price)}</div>
                <div className="price-period">Người/năm</div>
              </div>
              <button
                className={`plan-button ${plan.id === "premium" ? "premium-btn" : "free-btn"}`}
                onClick={() => plan.id === "premium" && openModal("duration", plan)}
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
