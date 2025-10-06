import React from "react";
import { NavLink } from "react-router-dom";

const MenuItems = () => {
  return (
    <div className="menu-items">
     
      <NavLink
        to="/gioithieu"
        className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
      >
        Giới thiệu
      </NavLink>
      
      <NavLink
        to="/marketplace"
        className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
      >
        Marketplace
      </NavLink>
      
      <NavLink
        to="/news"
        className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
      >
        Tin tức
      </NavLink>
      <NavLink
        to="/support"
        className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
      >
        Hỗ trợ
      </NavLink>
      <NavLink
        to="/contact"
        className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
      >
        Liên hệ
      </NavLink>
      <NavLink
        to="/auth"
        className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
      >
        👤
      </NavLink>
    </div>
  );
};

export default MenuItems;
