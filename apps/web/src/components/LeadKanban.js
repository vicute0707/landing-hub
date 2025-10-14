// src/components/LeadKanban.js

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Star, Tag, Building2, Info, Calendar } from 'lucide-react';
import '../styles/leads.css';

// Cấu hình các cột cho bảng Kanban
const columns = [
  { key: 'new', label: 'Mới', color: '#38bdf8' },
  { key: 'processing', label: 'Đang xử lý', color: '#facc15' },
  { key: 'converted', label: 'Chuyển đổi', color: '#4ade80' },
  { key: 'lost', label: 'Mất', color: '#f87171' },
];

/**
 * Component hiển thị danh sách Leads theo dạng bảng Kanban
 * @param {object} props - Props của component
 * @param {Array} props.leads - Mảng các đối tượng lead
 * @param {Function} props.onDelete - Hàm xử lý khi xóa lead
 * @param {Function} props.onDrop - Hàm xử lý khi thả lead vào cột mới
 * @param {Function} props.onEdit - Hàm xử lý khi click để chỉnh sửa lead
 */
const LeadKanban = ({ leads = [], onDelete, onDrop, onEdit }) => {
  // STATE: Quản lý trạng thái đang kéo-thả để phân biệt giữa "click" và "drag"
  const [isDragging, setIsDragging] = useState(false);

  // EVENT: Khi bắt đầu kéo một thẻ
  const handleDragStart = (e, lead) => {
    setIsDragging(true);
    e.dataTransfer.setData('lead', JSON.stringify(lead));
  };

  // EVENT: Khi kết thúc việc kéo (dù thả thành công hay không)
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // EVENT: Khi thả một thẻ vào một cột
  const handleDrop = (e, status) => {
    e.preventDefault();
    const lead = JSON.parse(e.dataTransfer.getData('lead'));
    if (onDrop) onDrop(status, lead);
  };

  // EVENT: Khi click vào một thẻ
  const handleClick = (lead) => {
    // Chỉ thực hiện hành động "edit" nếu người dùng không đang trong quá trình kéo
    if (!isDragging) {
      onEdit(lead);
    }
  };

  return (
    <div className="kanban-container">
      {columns.map((col) => (
        <div
          key={col.key}
          className="kanban-column"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, col.key)}
        >
          <div className="kanban-header" style={{ borderBottom: `3px solid ${col.color}` }}>
            <h3>{col.label}</h3>
            <span className="lead-count">{leads.filter((l) => l.status === col.key).length}</span>
          </div>
          <div className="kanban-list">
            {leads
              .filter((l) => l.status === col.key)
              .map((lead) => (
                <motion.div
                  key={lead._id}
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleClick(lead)}
                  whileHover={{ scale: 1.03, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="kanban-card-header">
                    <h4>{lead.name}</h4>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // Ngăn sự kiện click vào card
                        onDelete(lead._id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="kanban-card-body">
                    <div className={`kanban-card-detail-row ${!lead.company ? 'is-empty' : ''}`}>
                      <Building2 size={14} />
                      <span>{lead.company || '—'}</span>
                    </div>
                    <div className={`kanban-card-detail-row ${!lead.subject ? 'is-empty' : ''}`}>
                      <Info size={14} />
                      <span>{lead.subject || '—'}</span>
                    </div>
                    <div className="kanban-card-detail-row">
                      <Calendar size={14} />
                      <span>{new Date(lead.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  <div className="kanban-card-meta">
                    <span className="meta-tag source-tag">
                      <Tag size={14} /> {lead.source || 'N/A'}
                    </span>
                    <span className="meta-tag score-tag">
                      <Star size={14} /> {lead.score || 0}
                    </span>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LeadKanban;