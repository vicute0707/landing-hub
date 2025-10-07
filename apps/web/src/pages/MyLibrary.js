import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/Marketplace.css";

const MyLibrary = () => {
  const [pages, setPages] = useState([]);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) return;
    api.get(`/landing/my/${userId}`)
      .then(res => setPages(res.data))
      .catch(console.error);
  }, [userId]);

  return (
    <div className="my-library-page">
      <h1>Kho Landing Page của tôi</h1>
      <div className="templates-grid">
        {pages.map(p => (
          <div key={p._id} className="template-card">
            <h3>{p.name}</h3>
            <iframe src={p.landingPageUrl} style={{ width: "100%", height: "300px" }}></iframe>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyLibrary;
