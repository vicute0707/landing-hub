import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchArticle } from "../services/api";
import Background from "../components/Background";
import "../styles/news.css";

export default function NewsDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setLoading(true);
        setError(null);
        const articleData = await fetchArticle(id);
        setArticle(articleData);
      } catch (err) {
        console.error("Lỗi tải bài viết:", err);
        setError(err.message || "Không thể tải bài viết");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadArticle();
  }, [id]);

  if (loading) {
    return (
      <Background showShapes={false} fullWidth={true}>
        <div className="news-loading">Đang tải bài viết...</div>
      </Background>
    );
  }

  if (error) {
    return (
      <Background showShapes={false} fullWidth={true}>
        <div className="container">
          <div className="news-error">
            <h2>Đã xảy ra lỗi</h2>
            <p>{error}</p>
            <Link to="/news" className="back-link">
              ← Quay lại danh sách tin tức
            </Link>
          </div>
        </div>
      </Background>
    );
  }

  if (!article) {
    return (
      <Background showShapes={false} fullWidth={true}>
        <div className="container">
          <div className="not-found">
            <h2>Không tìm thấy bài viết</h2>
            <p>Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
            <Link to="/news" className="back-link">
              ← Quay lại danh sách tin tức
            </Link>
          </div>
        </div>
      </Background>
    );
  }

  return (
    <Background showShapes={false} fullWidth={true}>
      <div className="news-detail container">
        <Link to="/news" className="back-link">
          ← Quay lại danh sách tin tức
        </Link>

        <div className="news-detail-header">
          <h1 className="detail-title">{article.title}</h1>

          <p className="news-meta">
            <strong>{article.source}</strong> •{" "}
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleString("vi-VN")
              : "Chưa rõ thời gian"}
          </p>
        </div>

        {article.thumbnail && (
          <div className="detail-thumb-wrapper">
            <img
              className="detail-thumb"
              src={article.thumbnail}
              alt={article.title}
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>
        )}

        <div
          className="news-content"
          dangerouslySetInnerHTML={{
            __html:
              article.content ||
              `
              <p>${article.excerpt || ""}</p>
              <p><a href="${article.link}" target="_blank" rel="noopener noreferrer">Xem bài viết gốc</a></p>
            `,
          }}
        />

        <div className="original-link">
          <a href={article.link} target="_blank" rel="noopener noreferrer">
            📖 Xem bài viết gốc trên {article.source}
          </a>
        </div>
      </div>
    </Background>
  );
}
