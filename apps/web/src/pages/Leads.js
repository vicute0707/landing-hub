import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "@landinghub/api";
import LeadKanban from "../components/LeadKanban";
import LeadList from "../components/LeadList";
import LeadEditModal from "../components/LeadEditModal";
import '../styles/leads.css';

// ========================= LandingForm Modal =========================
const LandingFormModal = ({ onAdd, onClose }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    try {
      await onAdd(data);
      reset();
      onClose(); // đóng popup
      alert("Cảm ơn! Lead đã được gửi.");
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content show">
        <h2>📩 Thêm Lead mới</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <input {...register("name", { required: "Tên là bắt buộc" })} placeholder="Tên của bạn" />
            {errors.name && <p className="error-message">{errors.name.message}</p>}
          </div>
          <div className="form-group">
            <input {...register("email", { required: "Email là bắt buộc", pattern: { value: /^\S+@\S+$/i, message: "Email không hợp lệ" } })} placeholder="Email" type="email"/>
            {errors.email && <p className="error-message">{errors.email.message}</p>}
          </div>
          <div className="form-group">
            <input {...register("phone", { required: "Số điện thoại là bắt buộc" })} placeholder="Số điện thoại" type="tel"/>
            {errors.phone && <p className="error-message">{errors.phone.message}</p>}
          </div>
          
          <div className="form-group">
            <input {...register("position")} placeholder="Ghi chú"/>
          </div>
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="save-btn">Gửi</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ========================= Leads Page =========================
const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState("kanban");
  const [draggedLead, setDraggedLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [showForm, setShowForm] = useState(false); // state popup LandingForm

  // fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await api.get("/api/leads");
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : [];
        setLeads(data);
      } catch (err) {
        console.error("Fetch leads error:", err);
      }
    };
    fetchLeads();
  }, []);

  const onAdd = async (form) => {
    const newLead = { ...form, status: "new" };
    try {
      const res = await api.post("/api/leads", newLead);
      setLeads([...leads, res.data]);
    } catch (err) {
      console.error("Add lead error:", err);
      setLeads([...leads, { ...newLead, _id: Date.now().toString() }]);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Xóa lead này?")) return;
    try {
      await api.delete(`/api/leads/${id}`);
      setLeads(leads.filter((l) => l._id !== id));
    } catch (err) {
      console.error("Delete lead error:", err);
    }
  };

  const onDragStart = (lead) => setDraggedLead(lead);
  const onDrop = async (newStatus, lead) => {
    if (!lead) return;
    const updatedLead = { ...lead, status: newStatus };
    setLeads((prev) => prev.map((l) => (l._id === lead._id ? updatedLead : l)));
    try {
      await api.put(`/api/leads/${lead._id}`, updatedLead);
    } catch (err) {
      console.error("Update lead error:", err);
    }
  };

  const handleSaveEdit = async (form) => {
    try {
      const res = await api.put(`/api/leads/${form._id}`, form);
      const updated = res.data.data || form;
      setLeads((prev) => prev.map((l) => (l._id === form._id ? updated : l)));
      setEditingLead(null);
    } catch (err) {
      console.error("Update lead error:", err);
    }
  };

  const onUpdateInline = (id, key, value) => {
    setLeads((prev) => prev.map((l) => (l._id === id ? { ...l, [key]: value } : l)));
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-700">📊 Quản lý Leads</h2>
        <div className="header-leads">
  {/* Bên trái: +New */}
  <button className="button-new" onClick={() => setShowForm(true)}>
    + New
  </button>

  {/* Bên phải: Kanban/List */}
  <div className="view-buttons">
    <button
      onClick={() => setView("kanban")}
      className={`button-view ${view === "kanban" ? "active" : ""}`}
    >
      🧩 Kanban
    </button>
    <button
      onClick={() => setView("list")}
      className={`button-view ${view === "list" ? "active" : ""}`}
    >
      📋 List
    </button>
  </div>
</div>





      </div>

      {/* Kanban/List */}
      {view === "kanban" ? (
        <LeadKanban
          leads={leads}
          onUpdate={setLeads}
          onDelete={onDelete}
          onDrop={onDrop}
          onEdit={(lead) => setEditingLead(lead)}
          onDragStart={onDragStart}
        />
      ) : (
        <LeadList
          leads={leads}
          onUpdate={onUpdateInline}
          onDelete={onDelete}
          onEdit={(lead) => setEditingLead(lead)}
        />
      )}

      {/* LandingForm Modal */}
      {showForm && <LandingFormModal onAdd={onAdd} onClose={() => setShowForm(false)} />}

      {/* Edit Modal */}
      {editingLead && (
        <LeadEditModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default Leads;
