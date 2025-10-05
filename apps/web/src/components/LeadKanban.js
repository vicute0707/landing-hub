import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import "../styles/leads.css";

const columns = [
  { key: "new", label: "Mới", color: "#38bdf8" },
  { key: "processing", label: "Đang xử lý", color: "#facc15" },
  { key: "converted", label: "Chuyển đổi", color: "#4ade80" },
  { key: "lost", label: "Mất", color: "#f87171" },
];

const LeadKanban = ({ leads = [], onUpdate, onDelete, onDrop, onEdit, onDragStart }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e, lead) => {
    setIsDragging(false);
    e.dataTransfer.setData("lead", JSON.stringify(lead));
    if (onDragStart) onDragStart(lead);
  };

  const handleDrag = () => setIsDragging(true);

  const handleDrop = (e, status) => {
    e.preventDefault();
    const lead = JSON.parse(e.dataTransfer.getData("lead"));
    const updatedLeads = leads.map(l => (l._id === lead._id ? { ...l, status } : l));
    onUpdate(updatedLeads);
    if (onDrop) onDrop(status, lead);
  };

  const handleClick = (lead) => {
    if (!isDragging && onEdit) onEdit(lead);
  };

  return (
    <div className="kanban-container">
      {columns.map(col => (
        <div
          key={col.key}
          className="kanban-column"
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, col.key)}
        >
          <div className="kanban-header" style={{ borderBottom: `3px solid ${col.color}` }}>
            <h3>{col.label}</h3>
            <span className="lead-count">{leads.filter(l => l.status === col.key).length}</span>
          </div>
          <div className="kanban-list">
            {leads.filter(l => l.status === col.key).map(lead => (
              <motion.div
                key={lead._id}
                className="kanban-card"
                draggable
                onDragStart={e => handleDragStart(e, lead)}
                onDrag={handleDrag}
                onClick={() => handleClick(lead)}
                whileHover={{ scale: 1.03, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="kanban-card-header">
                  <h4>{lead.name}</h4>
                  <button
                    className="delete-btn"
                    onClick={e => { e.stopPropagation(); onDelete(lead._id); }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p>{lead.email}</p>
                <p>{lead.phone}</p>
                {lead.notes && <p className="notes">📝 {lead.notes}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LeadKanban;
