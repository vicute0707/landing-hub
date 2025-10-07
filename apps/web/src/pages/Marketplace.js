import React, { useState, useContext } from "react";
import { Filter, Save, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Background from "../components/Background";
import ProjectModal from "../components/ProjectModal";
import api from "../services/api";
import "../styles/Marketplace.css";
import { UserContext } from "../context/UserContext";

const templates = [
  { id: 1, name: "Landing môi giới cá nhân", type: "Môi giới cá nhân", style: "Hiện đại", thumbnail: "/images/template1.png", previewUrl: "https://example.com/landing1" },
  { id: 2, name: "Landing công ty môi giới", type: "Công ty môi giới", style: "Tối giản", thumbnail: "/images/template2.png", previewUrl: "https://example.com/landing2" },
  { id: 3, name: "Landing dự án cao cấp", type: "Dự án BĐS", style: "Luxury", thumbnail: "/images/template3.png", previewUrl: "https://example.com/landing3" },
  { id: 4, name: "Landing căn hộ thông minh", type: "Căn hộ", style: "Hiện đại", thumbnail: "/images/template4.png", previewUrl: "https://example.com/landing4" },
  { id: 5, name: "Landing giới thiệu dự án xanh", type: "Giới thiệu dự án", style: "Thiên nhiên", thumbnail: "/images/template5.png", previewUrl: "https://example.com/landing5" },
];

const Marketplace = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filters, setFilters] = useState({ type: [], style: [] });
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const { user } = useContext(UserContext); // ✅ dùng UserContext

  const toggleFilter = (category, value) => {
    setFilters(prev => {
      const newValues = prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value];
      return { ...prev, [category]: newValues };
    });
  };

  const filteredTemplates = templates.filter(t => {
    const matchType = filters.type.length === 0 || filters.type.includes(t.type);
    const matchStyle = filters.style.length === 0 || filters.style.includes(t.style);
    return matchType && matchStyle;
  });

 const handleSaveToLibrary = async (template) => {
  if (!user?.userId) {
    setToast("⚠️ Bạn cần đăng nhập để lưu vào kho!");
    setTimeout(() => {
      setToast(null);
      navigate("/auth");
    }, 2000);
    return;
  }

  try {
    setToast("⏳ Đang lưu vào kho...");
    const res = await api.post("/landing/clone", {
      userId: user.userId,
      templateId: template.id,
      name: template.name,
    });

    setToast("✅ Đã lưu vào kho cá nhân!");
    setTimeout(() => {
      setToast(null);
      navigate("/mylibrary");
    }, 2000);
  } catch (err) {
    console.error(err);
    setToast("❌ Lưu thất bại, vui lòng thử lại sau!");
    setTimeout(() => setToast(null), 2500);
  }
};

  return (
    <Background showShapes={false} fullWidth={true}>
      <div className="marketplace-page">
        <section className="marketplace-hero">
          <h1>Kho Giao Diện Landing Page</h1>
          <p>Khám phá và xem trước những mẫu landing page đẹp, thân thiện.</p>
        </section>

        <section className="filters-section">
          <h3><Filter size={18} /> Bộ lọc</h3>
          <div className="filters">
            <div className="filter-group">
              <h4>Loại Landing</h4>
              {["Căn hộ", "Môi giới cá nhân", "Dự án BĐS", "Công ty môi giới", "Giới thiệu dự án"].map(item => (
                <button
                  key={item}
                  className={`filter-btn ${filters.type.includes(item) ? "active" : ""}`}
                  onClick={() => toggleFilter("type", item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="filter-group">
              <h4>Phong cách thiết kế</h4>
              {["Hiện đại", "Tối giản", "Luxury", "Năng động", "Thiên nhiên"].map(item => (
                <button
                  key={item}
                  className={`filter-btn ${filters.style.includes(item) ? "active" : ""}`}
                  onClick={() => toggleFilter("style", item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="templates-section">
          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <div key={template.id} className="template-card fade-in">
                <div className="template-thumb"><img src={template.thumbnail} alt={template.name} /></div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p>{template.type} • {template.style}</p>
                  <div className="card-actions">
                    <button className="btn-outline" onClick={() => setSelectedTemplate(template)}><Eye size={16} /> Xem trước</button>
                    <button className="btn-primary" onClick={() => handleSaveToLibrary(template)}><Save size={16} /> Lưu vào kho</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedTemplate && <ProjectModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />}
        {toast && <div className="toast-message">{toast}</div>}
      </div>
    </Background>
  );
};

export default Marketplace;
