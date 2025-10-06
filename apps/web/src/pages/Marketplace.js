import React, { useState } from "react";
import { Filter, Save, Eye } from "lucide-react";
import Background from "../components/Background";
import ProjectModal from "../components/ProjectModal";
import "../styles/Marketplace.css";

const templates = [
  {
    id: 1,
    name: "Landing môi giới cá nhân",
    type: "Môi giới cá nhân",
    style: "Hiện đại",
    featured: true,
    thumbnail: "/images/template1.png",
    previewUrl: "https://example.com/landing1",
  },
  {
    id: 2,
    name: "Landing công ty môi giới",
    type: "Công ty môi giới",
    style: "Tối giản",
    featured: true,
    thumbnail: "/images/template2.png",
    previewUrl: "https://example.com/landing2",
  },
  {
    id: 3,
    name: "Landing dự án cao cấp",
    type: "Dự án BĐS",
    style: "Luxury",
    featured: true,
    thumbnail: "/images/template3.png",
    previewUrl: "https://example.com/landing3",
  },
  {
    id: 4,
    name: "Landing căn hộ thông minh",
    type: "Căn hộ",
    style: "Hiện đại",
    thumbnail: "/images/template4.png",
    previewUrl: "https://example.com/landing4",
  },
  {
    id: 5,
    name: "Landing giới thiệu dự án xanh",
    type: "Giới thiệu dự án",
    style: "Thiên nhiên",
    thumbnail: "/images/template5.png",
    previewUrl: "https://example.com/landing5",
  },
];

const Marketplace = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filters, setFilters] = useState({ type: [], style: [] });
  const [toast, setToast] = useState(null);

  const toggleFilter = (category, value) => {
    setFilters((prev) => {
      const newValues = prev[category].includes(value)
        ? prev[category].filter((v) => v !== value)
        : [...prev[category], value];
      return { ...prev, [category]: newValues };
    });
  };

  const filteredTemplates = templates.filter((t) => {
    const matchType =
      filters.type.length === 0 || filters.type.includes(t.type);
    const matchStyle =
      filters.style.length === 0 || filters.style.includes(t.style);
    return matchType && matchStyle;
  });

  const handleSaveToLibrary = (template) => {
    const saved = JSON.parse(localStorage.getItem("myTemplates")) || [];
    const exists = saved.find((t) => t.id === template.id);
    if (!exists) {
      saved.push(template);
      localStorage.setItem("myTemplates", JSON.stringify(saved));
      setToast("✅ Đã lưu vào kho cá nhân!");
    } else {
      setToast("⚠️ Mẫu này đã có trong kho của bạn.");
    }
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <Background showShapes={false} fullWidth={true}>
      <div className="marketplace-page">

        {/* === HERO === */}
        <section className="marketplace-hero">
          <h1>Kho Giao Diện Landing Page</h1>
          <p>
            Khám phá và xem trước những mẫu landing page đẹp, thân thiện — dành riêng cho các nhà môi giới bất động sản.
          </p>
        </section>

        {/* === FEATURED === */}
        <section className="featured-section">
          <h2>✨ Landing nổi bật</h2>
          <div className="featured-grid">
            {templates
              .filter((t) => t.featured)
              .map((t) => (
                <div key={t.id} className="featured-card fade-in">
                  <img src={t.thumbnail} alt={t.name} />
                  <div className="featured-info">
                    <h3>{t.name}</h3>
                    <span className="tag">{t.type}</span>
                    <div className="card-actions">
                      <button
                        className="btn-outline"
                        onClick={() => setSelectedTemplate(t)}
                      >
                        <Eye size={16} /> Xem trước
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => handleSaveToLibrary(t)}
                      >
                        <Save size={16} /> Lưu vào kho
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* === FILTER === */}
        <section className="filters-section">
          <h3><Filter size={18} /> Bộ lọc</h3>
          <div className="filters">
            <div className="filter-group">
              <h4>Loại Landing</h4>
              {["Căn hộ", "Môi giới cá nhân", "Dự án BĐS", "Công ty môi giới", "Giới thiệu dự án"].map((item) => (
                <button
                  key={item}
                  className={`filter-btn ${
                    filters.type.includes(item) ? "active" : ""
                  }`}
                  onClick={() => toggleFilter("type", item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="filter-group">
              <h4>Phong cách thiết kế</h4>
              {["Hiện đại", "Tối giản", "Luxury", "Năng động", "Thiên nhiên"].map((item) => (
                <button
                  key={item}
                  className={`filter-btn ${
                    filters.style.includes(item) ? "active" : ""
                  }`}
                  onClick={() => toggleFilter("style", item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* === TEMPLATE GRID === */}
        <section className="templates-section">
          <div className="templates-grid">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="template-card fade-in">
                <div className="template-thumb">
                  <img src={template.thumbnail} alt={template.name} />
                </div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p>{template.type} • {template.style}</p>
                  <div className="card-actions">
                    <button
                      className="btn-outline"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Eye size={16} /> Xem trước
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => handleSaveToLibrary(template)}
                    >
                      <Save size={16} /> Lưu vào kho
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedTemplate && (
          <ProjectModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
          />
        )}

        {toast && <div className="toast-message">{toast}</div>}
      </div>
    </Background>
  );
};

export default Marketplace;
