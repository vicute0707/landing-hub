// src/components/Login.js
import React, { useState } from "react";
import api from "@landinghub/api"; // hoặc axios nếu bạn chưa có module này
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { jwtDecode } from 'jwt-decode';
import "../styles/login.css";
import LoadingDog from "../components/DogLoader";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Login bằng Email/Password
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/api/auth/login", form);
      const token = res.data.token;
      localStorage.setItem("token", token);

      // decode token để lấy userId
      const decoded = jwtDecode(token);
      const userInfo = {
        userId: decoded._id || decoded.id || decoded.sub,
        role: decoded.role,
        name: decoded.name || decoded.email?.split("@")[0],
      };
      localStorage.setItem("userInfo", JSON.stringify(userInfo));

      setRedirecting(true);
      setTimeout(() => redirectBasedOnRole(userInfo.role), 1000);
    } catch (err) {
      console.error("❌ Lỗi đăng nhập:", err);
      setError(err.response?.data?.msg || "Đăng nhập thất bại");
      setLoading(false);
    }
  };

  // Login bằng Google
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        if (!tokenResponse.access_token)
          throw new Error("access_token không có trong tokenResponse");

        const userInfoGoogle = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );

        const res = await api.post("/api/auth/google/callback", {
          email: userInfoGoogle.data.email,
          name: userInfoGoogle.data.name,
        });

        const token = res.data.token;
        localStorage.setItem("token", token);

        const decoded = jwtDecode(token);
        const userInfo = {
          userId: decoded._id || decoded.id || decoded.sub,
          role: decoded.role,
          name: decoded.name || decoded.email?.split("@")[0],
        };
        localStorage.setItem("userInfo", JSON.stringify(userInfo));

        setRedirecting(true);
        setTimeout(() => redirectBasedOnRole(userInfo.role), 1000);
      } catch (err) {
        console.error("❌ Google login lỗi:", err);
        setError(err.response?.data?.msg || "Google login thất bại");
      }
    },
    onError: () => {
      setError("Google login thất bại");
    },
    flow: "implicit",
    scope: "openid email profile",
  });

  const redirectBasedOnRole = (role) => {
    switch (role) {
      case "admin":
        navigate("/dashboard");
        break;
      case "user":
      default:
        navigate("/dashboard");
        break;
    }
  };

  if (redirecting) return <LoadingDog />;

  return (
    <div className="login-container">
      <form className="form" onSubmit={handleLogin}>
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>Đăng Nhập</h2>

        {error && (
          <div style={{ color: "red", marginBottom: 12, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div className="flex-column">
          <label>Email</label>
          <div className="inputForm">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your Email"
              className="input"
              required
            />
          </div>
        </div>

        <div className="flex-column">
          <label>Password</label>
          <div className="inputForm">
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your Password"
              className="input"
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        <button type="submit" className="button-submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Sign In"}
        </button>

        <p className="p line">Or With</p>

        <div className="flex-row" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="btn google"
            onClick={() => handleGoogleLogin()}
          >
            Google
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
