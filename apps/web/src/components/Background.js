import React from "react";
import { NavLink } from "react-router-dom";
import "../styles/Background.css";
import logo from "../assets/logo.png";
import MenuItems from "./MenuItems";

const Background = ({ children, showShapes = true, fullWidth = false }) => {
  return (
    <div className="background-container">
      {/* Shapes chỉ render khi showShapes = true */}
      {showShapes && (
        <div className="background-shapes">
          <div className="shape-yellow-circle"></div>
          <div className="shape-blue-large"></div>
          <div className="shape-purple-overlay"></div>
          <div className="shape-pink-bottom"></div>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="logo-section">
            <NavLink to="/">
              <img src={logo} alt="Logo" className="logo-image" />
            </NavLink>
          </div>

          <MenuItems />

          <select className="language-selector">
            <option>Tiếng Việt</option>
            <option>English</option>
          </select>
        </div>
      </nav>

      {/* Main content */}
      <div className={`main-content ${fullWidth ? "full-width" : ""}`}>
        <div className="content-wrapper">{children}</div>
      </div>
    </div>
  );
};

export default Background;
