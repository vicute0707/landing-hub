import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import "../styles/accountMenu.css";

const MenuItems = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(UserContext);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Đồng bộ user từ localStorage nếu context chưa có
  useEffect(() => {
    if (!user) {
      const storedUser = localStorage.getItem('userInfo');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
  }, [user, setUser]);

  const handleLogout = () => {
    logout();
    setIsAccountOpen(false);
    navigate('/auth');
  };

  return (
    <div className="menu-items flex items-center gap-4 relative">
      <NavLink to="/gioithieu" className={({ isActive }) => isActive ? "menu-link active" : "menu-link"}>Giới thiệu</NavLink>
      <NavLink to="/marketplace" className={({ isActive }) => isActive ? "menu-link active" : "menu-link"}>Marketplace</NavLink>
      <NavLink to="/news" className={({ isActive }) => isActive ? "menu-link active" : "menu-link"}>Tin tức</NavLink>
      <NavLink to="/support" className={({ isActive }) => isActive ? "menu-link active" : "menu-link"}>Hỗ trợ</NavLink>
      <NavLink to="/contact" className={({ isActive }) => isActive ? "menu-link active" : "menu-link"}>Liên hệ</NavLink>

      {/* Menu Tài khoản */}
      <div className="relative">
        <button
          onClick={() => setIsAccountOpen(!isAccountOpen)}
          className="menu-link flex items-center gap-1"
        >
          👤 Tài khoản
        </button>

        {isAccountOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
            {user ? (
              <div>
                <div className="px-4 py-2 text-gray-800">{user.name}</div>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={handleLogout}
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => { navigate("/auth"); setIsAccountOpen(false); }}
              >
                Đăng nhập
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItems;
