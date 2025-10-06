import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNews } from "../services/api";
import Background from "../components/Background"; // ✅ dùng lại Background
import "../styles/news.css";

export default function NewsList() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadArticles = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      setError(null);
      const data = await fetchNews({ page: pageNum, limit: 12 });

      if (append) {
        setArticles((prev) => [...prev, ...(data.articles || [])]);
      } else {
        setArticles(data.articles || []);
      }

      setHasMore(data.articles && data.articles.length > 0);
    } catch (err) {
      setError("Không thể tải tin tức. Vui lòng thử lại sau.");
      console.error("Lỗi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles(1, false);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadArticles(nextPage, true);
  };

  return (
    <Background showShapes={false} fullWidth={true}>
      <div className="news-page-container">
        <div className="news-header">
         {/* 🌇 Hero Section */}
<section className="news-hero">
  <div className="news-hero-content">
    <h1>Tin tức Bất Động Sản</h1>
    <p>
      Cập nhật nhanh xu hướng, thị trường và cơ hội đầu tư mới nhất — 
      tổng hợp từ nhiều nguồn uy tín.
    </p>
  </div>
</section>

        </div>

        {error ? (
          <div className="news-error">
            <p>{error}</p>
            <button onClick={() => loadArticles(1, false)}>Thử lại</button>
          </div>
        ) : loading && articles.length === 0 ? (
          <div className="news-loading">Đang tải tin tức...</div>
        ) : (
          <>
            <div className="news-grid">
              {articles.map((article) => (
                <Link
                  to={`/news/${article.id}`}
                  key={article.id}
                  className="news-card"
                >
                  <div
                    className="news-thumb"
                    style={{
                      backgroundImage: `url(${
                        article.thumbnail ||
                        "https://picsum.photos/600/400?grayscale&blur=2"
                      })`,
                    }}
                  />
                  <div className="news-info">
                    <h3 className="news-title">{article.title}</h3>
                    <p className="news-meta">
                      <span>{article.source}</span> •{" "}
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString(
                            "vi-VN"
                          )
                        : "Chưa rõ ngày"}
                    </p>
                    <p className="news-excerpt">
                      {article.excerpt || "Xem chi tiết..."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <div className="load-more">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="load-more-btn"
                >
                  {loading ? "Đang tải..." : "Xem thêm tin"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Background>
  );
}
