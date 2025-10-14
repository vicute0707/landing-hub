import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import api from "@landinghub/api";
import LeadKanban from "../components/LeadKanban";
import LeadList from "../components/LeadList";
import LeadEditModal from "../components/LeadEditModal";
import '../styles/leads.css';

// ========================= LandingForm Modal (Giữ nguyên bên trong) =========================
const LandingFormModal = ({ onAdd, onClose }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    try {
      // Form này dùng để thêm thủ công, nên source là "Manual"
      // Đổi tên 'position' thành 'notes' để đồng bộ với backend
      const leadData = { ...data, source: "Manual", notes: data.position };
      delete leadData.position;

      await onAdd(leadData);
      reset();
      // onClose(); // Hàm onAdd đã xử lý việc đóng form
    } catch (err) {
      alert("Lỗi khi thêm lead: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content show">
        <h2>📩 Thêm Lead mới (Thủ công)</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <input {...register("name", { required: "Tên là bắt buộc" })} placeholder="Tên" />
            {errors.name && <p className="error-message">{errors.name.message}</p>}
          </div>
          <div className="form-group">
            <input {...register("email", { required: "Email là bắt buộc" })} placeholder="Email" type="email"/>
            {errors.email && <p className="error-message">{errors.email.message}</p>}
          </div>
          <div className="form-group">
            <input {...register("phone")} placeholder="Số điện thoại" type="tel"/>
          </div>
          <div className="form-group">
            <textarea {...register("position")} placeholder="Ghi chú ban đầu"/>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="save-btn">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ========================= Leads Page (Component chính) =========================
const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState("kanban");
  const [editingLead, setEditingLead] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [filters, setFilters] = useState({
    searchTerm: '', source: '', status: '', startDate: '', endDate: '',
  });

  // Hàm lấy dữ liệu từ server, có kèm theo tham số lọc
  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await api.get(`/api/leads?${params}`);
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch leads error:", err);
    }
  }, [filters]);

  // Tự động tải lại dữ liệu mỗi khi bộ lọc thay đổi
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handler cho các input trong bộ lọc
  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetFilters = () => {
    setFilters({ searchTerm: '', source: '', status: '', startDate: '', endDate: '' });
  };

  // Các hàm xử lý (thêm, xóa, sửa) sẽ gọi lại fetchLeads để đảm bảo dữ liệu luôn mới
  const handleAddLead = async (formData) => {
    try {
      await api.post("/api/leads", formData);
      fetchLeads();
      setShowAddForm(false);
    } catch (err) {
      console.error("Add lead error:", err);
      throw err; // Ném lỗi ra để component con có thể xử lý
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lead này?")) return;
    try {
      await api.delete(`/api/leads/${id}`);
      fetchLeads();
    } catch (err) { console.error("Delete lead error:", err); }
  };

  const handleSaveEdit = async (formData) => {
    try {
      await api.put(`/api/leads/${formData._id}`, formData);
      setEditingLead(null);
      fetchLeads();
    } catch (err) { console.error("Update lead error:", err); }
  };

  const handleAddActivity = async (leadId, activityData) => {
    try {
      await api.post(`/api/leads/${leadId}/activities`, activityData);
      fetchLeads();
    } catch (err) { console.error("Error adding activity:", err); throw err; }
  };
  
  const onDrop = async (newStatus, lead) => {
    if (!lead || lead.status === newStatus) return;
    let newScore = lead.score || 0;
    if (newStatus === 'processing' && lead.status === 'new') newScore += 1;
    else if (newStatus === 'converted') newScore += 2;
    const finalScore = Math.min(newScore, 5);

    try {
      await api.put(`/api/leads/${lead._id}`, { status: newStatus, score: finalScore });
      fetchLeads();
    } catch (err) { console.error("Update lead on drop error:", err); }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-700">📊 Quản lý Leads</h2>
        <div className="header-leads">
          <button className="button-new" onClick={() => setShowAddForm(true)}>+ New</button>
          <div className="view-buttons">
            <button onClick={() => setView("kanban")} className={`button-view ${view === "kanban" ? "active" : ""}`}>🧩 Kanban</button>
            <button onClick={() => setView("list")} className={`button-view ${view === "list" ? "active" : ""}`}>📋 List</button>
          </div>
        </div>
      </div>

      <div className="filter-container">
        <input type="text" name="searchTerm" placeholder="Tìm theo tên, email, công ty..." value={filters.searchTerm} onChange={handleFilterChange} className="filter-input"/>
        <select name="source" value={filters.source} onChange={handleFilterChange} className="filter-select">
          <option value="">Tất cả nguồn</option>
          <option value="Contact Page">Trang Liên hệ</option>
          <option value="Support Form">Form Hỗ trợ</option>
          <option value="Website Form">Form Website</option>
          <option value="Manual">Nhập tay</option>
        </select>
        <select name="status" value={filters.status} onChange={handleFilterChange} className="filter-select">
          <option value="">Tất cả trạng thái</option>
          <option value="new">Mới</option>
          <option value="processing">Đang xử lý</option>
          <option value="converted">Chuyển đổi</option>
          <option value="lost">Mất</option>
        </select>
        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="filter-date"/>
        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="filter-date"/>
        <button onClick={resetFilters} className="filter-reset-btn">Xóa lọc</button>
      </div>

      {view === "kanban" ? (
        <LeadKanban leads={leads} onDelete={handleDeleteLead} onDrop={onDrop} onEdit={setEditingLead} />
      ) : (
        <LeadList leads={leads} onDelete={handleDeleteLead} onEdit={setEditingLead} />
      )}

      {showAddForm && <LandingFormModal onAdd={handleAddLead} onClose={() => setShowAddForm(false)} />}
      
      {editingLead && (
        <LeadEditModal lead={editingLead} onClose={() => setEditingLead(null)} onSave={handleSaveEdit} onAddActivity={handleAddActivity} />
      )}
    </div>
  );
};

export default Leads;