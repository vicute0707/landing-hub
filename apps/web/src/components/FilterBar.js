import React from "react";
import "../styles/Marketplace.css";

const FilterBar = ({ filters, setFilters }) => (
  <div className="filter-bar">
    <select
      value={filters.type}
      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
    >
      <option>Tất cả</option>
      <option>Căn hộ</option>
      <option>Biệt thự</option>
      <option>Resort</option>
    </select>

    <select
      value={filters.location}
      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
    >
      <option>Tất cả</option>
      <option>TP.HCM</option>
      <option>Hà Nội</option>
      <option>Đà Nẵng</option>
      <option>Nha Trang</option>
      <option>Phú Quốc</option>
    </select>
  </div>
);

export default FilterBar;
