import React, { useState, useContext, useEffect } from "react";
import { Filter, Save, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Background from "../components/Background";
import ProjectModal from "../components/ProjectModal";
import api from "../services/api";
import "../styles/Marketplace.css";
import { UserContext } from "../context/UserContext";

const Marketplace = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filters, setFilters] = useState({ type: [], style: [] });
  const [toast, setToast] = useState(null);
  const [iframeError, setIframeError] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  // === Fetch templates thật từ server ===
  useEffect(() => {
    api.get("/templates")
      .then(res => setTemplates(res.data))
      .catch(err => console.error("❌ Lỗi fetch template:", err));
  }, []);

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

  // === Lưu template vào thư viện người dùng ===
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
      await api.post("/landing/clone", {
        userId: user.userId,
        templateId: template._id,
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

        {/* === Templates Grid === */}
        <section className="templates-section">
          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <div key={template._id} className="template-card fade-in">
                <div className="template-thumb">
                  <img src={`${process.env.REACT_APP_API_URL}${template.thumbnail}`} alt={template.name} />
                </div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p>{template.type} • {template.style}</p>
                  <div className="card-actions">
                    <button className="btn-outline" onClick={() => {
                      setIframeError(false);
                      setSelectedTemplate(template);
                    }}>
                      <Eye size={16} /> Xem trước
                    </button>
                    <button className="btn-primary" onClick={() => handleSaveToLibrary(template)}>
                      <Save size={16} /> Lưu vào kho
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === Preview Modal === */}
        {selectedTemplate && (
          <ProjectModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)}>
            {iframeError ? (
              <div style={{
                padding: "40px",
                textAlign: "center",
                color: "#888",
                fontSize: "16px"
              }}>
                ❌ Không thể tải preview cho mẫu này.
                <br />
                <small>Vui lòng kiểm tra lại đường dẫn hoặc backend server.</small>
              </div>
            ) : (
              <iframe
                src={`${process.env.REACT_APP_API_URL}${selectedTemplate.filePath}`}
                title={selectedTemplate.name}
                width="100%"
                height="600px"
                style={{ border: "none" }}
                onError={() => setIframeError(true)}
              />
            )}
          </ProjectModal>
        )}

        {toast && <div className="toast-message">{toast}</div>}
      </div>
    </Background>
  );
};

export default Marketplace;
