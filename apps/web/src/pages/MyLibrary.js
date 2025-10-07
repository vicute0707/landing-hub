// src/components/MyLibrary.js
import React, { useEffect, useState, useContext } from "react";
import api from "@landinghub/api";
import { UserContext } from "../context/UserContext";
import "../styles/MyLibrary.css";

const MyLibrary = () => {
  const { user, loading: userLoading } = useContext(UserContext);
  const [landings, setLandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userLoading) return; // đợi user context load xong

    if (!user?.userId) {
      console.error("❌ Không tìm thấy userId hoặc token");
      setError("Bạn chưa đăng nhập hoặc token không hợp lệ");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");

    api.get(`/api/landing/my/${user.userId}`, {
  headers: { Authorization: `Bearer ${token}` },
})

      .then((res) => {
        console.log("✅ API trả về:", res.data);
        setLandings(res.data);
      })
      .catch((err) => {
        console.error("❌ Lỗi khi load MyLibrary:", err);
        setError("Không tải được danh sách landing. Vui lòng thử lại sau.");
      })
      .finally(() => setLoading(false));
  }, [user, userLoading]);

  if (userLoading || loading) return <p>Đang tải...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!landings || landings.length === 0) {
    return (
      <div className="no-landing">
        <h2>Kho Landing Page của tôi</h2>
        <p>Chưa có landing nào được lưu.</p>
      </div>
    );
  }

  return (
    <div className="mylibrary">
      <h2>Kho Landing Page của tôi</h2>
      <div className="landing-list">
        {landings.map((item) => (
          <div key={item._id} className="landing-card">
            <img
              src={item.thumbnail || "/default-thumbnail.jpg"}
              alt={item.name}
              className="thumbnail"
            />
            <h3>{item.name}</h3>
            <a
              href={item.landingPageUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem landing
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyLibrary;
