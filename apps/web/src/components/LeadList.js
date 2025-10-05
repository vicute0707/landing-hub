import React from 'react';
import '../styles/leads.css';

const LeadList = ({ leads, onUpdate, onDelete, onEdit }) => {
  return (
    <div className="lead-table overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Tên</th>
            <th>Email</th>
            <th>Điện thoại</th>
            <th>Trạng thái</th>
            <th>Ghi chú</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr><td colSpan="6">Chưa có dữ liệu</td></tr>
          ) : (
            leads.map(lead => (
              <tr
                key={lead._id}
                onClick={() => onEdit && onEdit(lead)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td data-label="Tên">{lead.name}</td>
                <td data-label="Email">{lead.email}</td>
                <td data-label="Điện thoại">{lead.phone}</td>
                <td data-label="Trạng thái">
                  <select
                    value={lead.status}
                    onChange={e => { e.stopPropagation(); onUpdate(lead._id, 'status', e.target.value); }}
                  >
                    <option value="new">Mới</option>
                    <option value="processing">Đang xử lý</option>
                    <option value="converted">Chuyển đổi</option>
                    <option value="lost">Mất</option>
                  </select>
                </td>
                <td data-label="Ghi chú">
                  <input
                    type="text"
                    value={lead.notes || ''}
                    onChange={e => { e.stopPropagation(); onUpdate(lead._id, 'notes', e.target.value); }}
                    placeholder="Ghi chú..."
                  />
                </td>
                <td data-label="Hành động">
                  <button
                    className="delete-btn"
                    onClick={e => { e.stopPropagation(); onDelete(lead._id); }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LeadList;
