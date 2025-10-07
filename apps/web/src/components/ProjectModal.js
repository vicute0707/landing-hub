import React, { useContext, useState } from "react";
import { X, Save } from "lucide-react";
import "../styles/Marketplace.css";
import api from "../services/api";
import { UserContext } from "../context/UserContext";

const ProjectModal = ({ template, onClose, onSaved }) => {
  const { user } = useContext(UserContext);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ✅ Đảm bảo có đường dẫn preview chính xác
  const landingPagePath =
    template.filePath?.startsWith("/public")
      ? `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${template.filePath}`
      : template.previewUrl || template.landingPageUrl;

  // --- SAVE FUNCTION ---
  const handleSave = async () => {
    if (!user) {
      setToast("⚠️ Bạn cần đăng nhập để lưu vào kho!");
      setTimeout(() => setToast(null), 2500);
      return;
    }

    try {
      setSaving(true);
      setToast("⏳ Đang lưu vào kho...");
      await api.post("/landing/clone", {
        userId: user.userId,
        // userId: user._id || user.id,
        templateId: template._id,
        name: template.name,
      });

      setToast("✅ Lưu thành công!");
      setTimeout(() => {
        setToast(null);
        if (onSaved) onSaved();
      }, 2000);
    } catch (error) {
      console.error(error);
      setToast("❌ Lưu thất bại, vui lòng thử lại!");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className="modal-title">{template.name}</h2>

        {landingPagePath ? (
          <div className="iframe-container">
            <iframe
              src={landingPagePath}
              title={template.name}
              frameBorder="0"
              loading="lazy"
              style={{
                width: "100%",
                height: "70vh",
                borderRadius: "10px",
                background: "#fff",
              }}
            />
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "#888" }}>
            🚫 Không tìm thấy file HTML cho mẫu này.
          </p>
        )}

        <div className="modal-actions" style={{ marginTop: "15px", textAlign: "right" }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? "Đang lưu..." : "Lưu vào kho"}
          </button>
        </div>

        {toast && <div className="toast-message">{toast}</div>}
      </div>
    </div>
  );
};

export default ProjectModal;
