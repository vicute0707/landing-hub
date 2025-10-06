import React from "react";
import { X } from "lucide-react";
import "../styles/Marketplace.css";

const ProjectModal = ({ template, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h2 className="modal-title">{template.name}</h2>
        <div className="iframe-container">
          <iframe
            src={template.previewUrl}
            title={template.name}
            frameBorder="0"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
