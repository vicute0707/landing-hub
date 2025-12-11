import React, { useState, useEffect } from "react";
import { Eye, X, Monitor, Smartphone } from "lucide-react";
import axios from "axios";
import "../styles/PreviewModal.css";

const MarketplacePreviewModal = ({ page, onClose }) => {
    const [viewMode, setViewMode] = useState("desktop");
    const [previewHtml, setPreviewHtml] = useState("");
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [popupStates, setPopupStates] = useState({});
    const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

    useEffect(() => {
        if (page) {
            loadPreviewData();
        }
    }, [page]);

    const loadPreviewData = async () => {
        setLoading(true);
        const token = localStorage.getItem("token");

        try {
            // --- 1. Gọi API đúng route backend ---
            // Backend expects: /api/marketplace/:id/preview-data
            const url = `${API_BASE_URL}/api/marketplace/${page._id}/preview-data`;

            const response = await axios.get(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (response.data?.success) {
                const { htmlContent, pageData: data } = response.data.data;

                setPreviewHtml(htmlContent || "");
                setPageData(data || {});
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error("Preview-data failed → fallback to plain HTML:", err);
        }

        // --- 2. FALLBACK: nếu preview-data lỗi, load HTML thuần ---
        try {
            // Backend expects: /api/marketplace/:id/preview
            const fallbackUrl = `${API_BASE_URL}/api/marketplace/${page._id}/preview`;

            const htmlResponse = await fetch(fallbackUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (htmlResponse.ok) {
                const html = await htmlResponse.text();
                setPreviewHtml(html);
            } else {
                console.warn("Fallback preview failed:", htmlResponse.status);
            }
        } catch (err) {
            console.error("Fallback HTML preview error:", err);
        }

        setLoading(false);
    };


    const handleClose = (e) => {
        e?.stopPropagation();
        setPopupStates({});
        onClose();
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose(e);
        }
    };

    // Toggle popup in preview iframe - giống PreviewModal
    const handleTogglePopup = (popupId) => {
        try {
            const iframe = document.querySelector('.modal1-iframe');
            if (iframe && iframe.contentWindow) {
                const win = iframe.contentWindow;
                if (win.LPB && win.LPB.popups) {
                    if (popupStates[popupId]) {
                        win.LPB.popups.close(popupId);
                        setPopupStates(prev => ({ ...prev, [popupId]: false }));
                    } else {
                        win.LPB.popups.open(popupId);
                        setPopupStates(prev => ({ ...prev, [popupId]: true }));
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling popup:', error);
        }
    };

    if (!page) return null;

    // Extract popups from pageData (giống PreviewModal)
    const popups = pageData?.elements?.filter(el => el.type === 'popup') || [];

    return (
        <div className="modal1-overlay modal1-overlay--preview" onClick={handleOverlayClick}>
            <div className="modal1-content modal1-content--preview">
                <div className="modal1-body">
                    {/* TABS */}
                    <div className="preview-tabs">
                        <button
                            className={`preview-tab ${viewMode === "desktop" ? "active" : ""}`}
                            onClick={() => setViewMode("desktop")}
                        >
                            <Monitor size={16} style={{ marginRight: "6px" }} />
                            Desktop
                        </button>
                        <button
                            className={`preview-tab ${viewMode === "mobile" ? "active" : ""}`}
                            onClick={() => setViewMode("mobile")}
                        >
                            <Smartphone size={16} style={{ marginRight: "6px" }} />
                            Mobile
                        </button>
                        <button
                            onClick={handleClose}
                            className="btn-close"
                            aria-label="Đóng modal"
                            title="Đóng (Esc)"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* POPUP CONTROLS - giống PreviewModal */}
                    {popups.length > 0 && (
                        <div style={{
                            padding: "8px 20px",
                            background: "#f9fafb",
                            borderBottom: "1px solid #e5e7eb",
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            flexWrap: "wrap"
                        }}>
                            <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>
                                Preview Popups:
                            </span>
                            {popups.map(popup => (
                                <button
                                    key={popup.id}
                                    onClick={() => handleTogglePopup(popup.id)}
                                    style={{
                                        padding: "4px 12px",
                                        fontSize: "12px",
                                        borderRadius: "6px",
                                        border: popupStates[popup.id] ? "1px solid #3b82f6" : "1px solid #d1d5db",
                                        background: popupStates[popup.id] ? "#eff6ff" : "#ffffff",
                                        color: popupStates[popup.id] ? "#3b82f6" : "#6b7280",
                                        cursor: "pointer",
                                        fontWeight: 500,
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {popup.componentData?.title || popup.id}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* PREVIEW CONTAINER */}
                    <div className={`preview-container ${viewMode}`}>
                        <div className="preview-frame">
                            {loading ? (
                                <div className="preview-placeholder">
                                    <Eye size={48} style={{ color: "#cbd5e1", marginBottom: "16px" }} />
                                    <p>Đang tải preview...</p>
                                </div>
                            ) : previewHtml ? (
                                viewMode === "desktop" ? (
                                    // DESKTOP VIEW - giống PreviewModal
                                    <div className="desktop-preview">
                                        <div className="desktop-header">
                                            <span className="control-btn red"></span>
                                            <span className="control-btn yellow"></span>
                                            <span className="control-btn green"></span>
                                            <p className="modal1-title" style={{
                                                margin: "6px 0 0 0",
                                                color: "#64748b",
                                                fontSize: "0.875rem",
                                                fontWeight: "500",
                                            }}>
                                                {page.title || "Marketplace Preview"}
                                            </p>
                                        </div>
                                        <iframe
                                            srcDoc={previewHtml}
                                            className="modal1-iframe"
                                            title="Desktop Preview"
                                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                border: "none",
                                                overflow: "auto",
                                                scrollBehavior: "smooth",
                                            }}
                                        />
                                    </div>
                                ) : (
                                    // MOBILE VIEW - giống PreviewModal
                                    <div className="mobile-preview">
                                        <div className="mobile-frame">
                                            <iframe
                                                srcDoc={previewHtml}
                                                className="modal1-iframe mobile-iframe"
                                                title="Mobile Preview"
                                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                                style={{
                                                    width: "375px",
                                                    height: "667px",
                                                    border: "none",
                                                    transformOrigin: "top center",
                                                    overflowY: "auto",
                                                    overflowX: "hidden",
                                                    scrollBehavior: "smooth",
                                                    WebkitOverflowScrolling: "touch",
                                                }}
                                                onLoad={(e) => {
                                                    // Force mobile layout matching builder
                                                    try {
                                                        const iframeDoc = e.target.contentDocument || e.target.contentWindow.document;
                                                        if (!iframeDoc) return;

                                                        // Inject viewport meta tag
                                                        if (!iframeDoc.querySelector('meta[name="viewport"]')) {
                                                            const viewport = iframeDoc.createElement('meta');
                                                            viewport.name = 'viewport';
                                                            viewport.content = 'width=375, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                                                            iframeDoc.head.appendChild(viewport);
                                                        }

                                                        // Inject mobile-specific CSS to match builder layout
                                                        const mobileStyles = iframeDoc.createElement('style');
                                                        mobileStyles.id = 'mobile-preview-styles';
                                                        mobileStyles.textContent = `
                                                            /* Force mobile layout matching builder */
                                                            html, body {
                                                                width: 375px !important;
                                                                max-width: 375px !important;
                                                                overflow-x: hidden !important;
                                                            }

                                                            #lpb-canvas {
                                                                width: 375px !important;
                                                                max-width: 375px !important;
                                                            }

                                                            .lpb-section {
                                                                position: absolute !important;
                                                                width: 100% !important;
                                                                max-width: 375px !important;
                                                                left: 0 !important;
                                                                right: 0 !important;
                                                                transform: none !important;
                                                                margin: 0 !important;
                                                            }

                                                            /* Force text to wrap on mobile */
                                                            .lpb-heading, .lpb-paragraph, .lpb-button {
                                                                max-width: 100% !important;
                                                                word-wrap: break-word !important;
                                                            }

                                                            /* Scale images properly */
                                                            .lpb-image img {
                                                                max-width: 100% !important;
                                                                height: auto !important;
                                                            }
                                                        `;

                                                        if (!iframeDoc.getElementById('mobile-preview-styles')) {
                                                            iframeDoc.head.appendChild(mobileStyles);
                                                        }

                                                        // Apply mobile positions via JavaScript
                                                        const applyMobilePositions = () => {
                                                            const sections = iframeDoc.querySelectorAll('.lpb-section[data-mobile-y]');
                                                            sections.forEach(section => {
                                                                const mobileY = section.getAttribute('data-mobile-y');
                                                                if (mobileY) {
                                                                    section.style.top = `${mobileY}px`;
                                                                }
                                                            });

                                                            const elements = iframeDoc.querySelectorAll('.lpb-element[data-mobile-x], .lpb-element[data-mobile-y]');
                                                            elements.forEach(el => {
                                                                const mobileX = el.getAttribute('data-mobile-x');
                                                                const mobileY = el.getAttribute('data-mobile-y');
                                                                if (mobileX) el.style.left = `${mobileX}px`;
                                                                if (mobileY) el.style.top = `${mobileY}px`;
                                                            });
                                                        };

                                                        applyMobilePositions();
                                                        setTimeout(applyMobilePositions, 100);
                                                    } catch (error) {
                                                        console.warn('Could not inject mobile styles:', error);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="mobile-home-button"></div>
                                    </div>
                                )
                            ) : (
                                // PLACEHOLDER
                                <div className="preview-placeholder">
                                    <Eye size={48} style={{ color: "#cbd5e1", marginBottom: "16px" }} />
                                    <p>Không có nội dung preview.</p>
                                    <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginTop: "8px" }}>
                                        Page này chưa có HTML để hiển thị.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketplacePreviewModal;