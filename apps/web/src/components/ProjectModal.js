import React, { useContext, useState } from "react"; 
import { X, Save } from "lucide-react";
import "../styles/Marketplace.css";
import api from "../services/api";
import { UserContext } from "../context/UserContext";

const ProjectModal = ({ template, onClose, onSaved }) => {
  const { user } = useContext(UserContext); // ✅ lấy user từ context
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const landingPagePath = template.landingPageUrl || template.previewUrl;

  const handleSave = async () => {
    if (!user) {
      setToast("⚠️ Bạn cần đăng nhập để lưu vào kho!");
      setTimeout(() => {
        setToast(null);
      }, 2000);
      return;
    }

    try {
      setSaving(true);
      setToast("⏳ Đang lưu vào kho...");
      await api.post("/landing/clone", {
        userId: user.userId, // ✅ dùng userContext
        templateId: template.id,
        name: template.name,
      });
      setToast("✅ Lưu thành công!");
      setTimeout(() => {
        setToast(null);
        if (onSaved) onSaved(); // callback để marketplace có thể reload MyLibrary
      }, 2000);
    } catch (err) {
      console.error(err);
      setToast("❌ Lưu thất bại, vui lòng thử lại!");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="modal-title">{template.name}</h2>

        <div className="iframe-container">
          <iframe
            src={landingPagePath}
            title={template.name}
            frameBorder="0"
            style={{ width: "100%", height: "70vh" }}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: "10px", textAlign: "right" }}>
          <button 
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} /> {saving ? "Đang lưu..." : "Lưu vào kho"}
          </button>
        </div>

        {toast && <div className="toast-message">{toast}</div>}
      </div>
    </div>
  );
};

export default ProjectModal;
