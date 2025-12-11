import React, { useState, useRef } from 'react';
import api from '@landinghub/api';
import { toast } from 'react-toastify';
import { renderStaticHTML } from '../../utils/pageUtils';
import '../../styles/CreatePagePopup.css';

const CreatePagePopup = ({ isOpen, onClose, onCreateSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [loading, setLoading] = useState(false);
    const [createMode, setCreateMode] = useState('scratch'); // 'scratch' or 'import'
    const [importFile, setImportFile] = useState(null);
    const [importData, setImportData] = useState(null);
    const fileInputRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleModeChange = (mode) => {
        setCreateMode(mode);
        setImportFile(null);
        setImportData(null);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.iuhpage')) {
            toast.error('Vui lòng chọn file .iuhpage');
            return;
        }

        setImportFile(file);

        // Đọc và parse file
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const iuhpageData = JSON.parse(content);

                // Validate format
                if (iuhpageData.format !== 'iuhpage' || !iuhpageData.pageData) {
                    toast.error('File .iuhpage không hợp lệ');
                    setImportFile(null);
                    return;
                }

                // Lưu data để dùng khi submit
                setImportData(iuhpageData);

                // Auto-fill tên và mô tả nếu có
                if (iuhpageData.metadata) {
                    setFormData({
                        name: iuhpageData.metadata.title || '',
                        description: iuhpageData.metadata.description || ''
                    });
                }

                toast.success(`Đã đọc file ${file.name} thành công!`);
            } catch (error) {
                console.error('Error parsing .iuhpage:', error);
                toast.error('Lỗi khi đọc file: ' + error.message);
                setImportFile(null);
                setImportData(null);
            }
        };

        reader.onerror = () => {
            toast.error('Lỗi khi đọc file');
            setImportFile(null);
        };

        reader.readAsText(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = formData.name.trim();
        if (!trimmedName) {
            toast.error('Tên landing page là bắt buộc');
            return;
        }

        if (createMode === 'import' && !importData) {
            toast.error('Vui lòng chọn file .iuhpage để import');
            return;
        }

        setLoading(true);
        try {
            let payload = {
                name: trimmedName,
                description: formData.description.trim(),
            };

            // Nếu import mode, thêm pageData và html
            if (createMode === 'import' && importData) {
                const { pageData, embeddedImages } = importData;

                // Convert base64 images back to data URLs trong pageData
                const processedPageData = JSON.parse(JSON.stringify(pageData));

                const updateImageUrls = (element) => {
                    if (element.type === 'image' && element.componentData?.src) {
                        const oldSrc = element.componentData.src;
                        if (embeddedImages[oldSrc]) {
                            element.componentData.src = embeddedImages[oldSrc];
                        }
                    }

                    if (element.styles?.backgroundImage) {
                        const match = element.styles.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                        if (match && match[1] && embeddedImages[match[1]]) {
                            element.styles.backgroundImage = `url('${embeddedImages[match[1]]}')`;
                        }
                    }

                    if (element.children && Array.isArray(element.children)) {
                        element.children.forEach(child => updateImageUrls(child));
                    }
                };

                if (processedPageData.elements) {
                    processedPageData.elements.forEach(element => updateImageUrls(element));
                }

                // Generate HTML từ pageData sử dụng pageUtils
                const html = renderStaticHTML(processedPageData);

                payload.pageData = processedPageData;
                payload.html = html;
            }

            console.log('Sending POST request to /api/pages with payload:', payload);
            const response = await api.post('/api/pages', payload);
            console.log('Response from /api/pages:', response);

            if (response.data.success && response.data.page && (response.data.page.id || response.data.page._id)) {
                toast.success(createMode === 'import'
                    ? 'Import landing page thành công!'
                    : 'Tạo landing page thành công!');
                onCreateSuccess(response.data.page);
                handleClose();
            } else {
                console.error('Invalid response format:', response.data);
                toast.error('Tạo landing page thất bại: ' + (response.data.error || 'Dữ liệu trả về không hợp lệ'));
            }
        } catch (error) {
            console.error('Lỗi khi tạo landing page:', error);
            toast.error('Lỗi khi tạo landing page: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({ name: '', description: '' });
        setCreateMode('scratch');
        setImportFile(null);
        setImportData(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="popup-overlay">
            <div className="popup-content">
                <h2>Tạo Landing Page Mới</h2>
                <form onSubmit={handleSubmit}>
                    {/* Mode Selection */}
                    <div className="form-group">
                        <label>Phương thức tạo</label>
                        <div className="mode-selection">
                            <div
                                className={`mode-option ${createMode === 'scratch' ? 'active' : ''}`}
                                onClick={() => handleModeChange('scratch')}
                            >
                                <div className="mode-icon">📝</div>
                                <div className="mode-info">
                                    <h4>Tạo landing page</h4>
                                    <p>Bắt đầu với trang trống</p>
                                </div>
                                <div className="mode-radio">{createMode === 'scratch' ? '⚫' : '⚪'}</div>
                            </div>

                        </div>
                    </div>

                    {/* File Upload (chỉ hiện khi mode = import) */}
                    {createMode === 'import' && (
                        <div className="form-group">
                            <label htmlFor="importFile">
                                Chọn file .iuhpage <span>*</span>
                            </label>
                            <div className="file-upload-area">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    id="importFile"
                                    accept=".iuhpage"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    className="file-select-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <i className="fas fa-file-upload"></i>
                                    {importFile ? importFile.name : 'Chọn file .iuhpage'}
                                </button>
                                {importFile && (
                                    <div className="file-info">
                                        <span className="file-check">✅</span>
                                        <span>Đã chọn: {importFile.name}</span>
                                    </div>
                                )}
                            </div>
                            <small className="form-hint">
                                💡 File .iuhpage chứa toàn bộ nội dung và thiết kế của landing page
                            </small>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="name">Tên Landing Page <span>*</span></label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Nhập tên landing page"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Mô tả</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Nhập mô tả (tùy chọn)"
                        />
                    </div>
                    <div className="form-buttons">
                        <button type="button" onClick={handleClose} disabled={loading}>
                            Hủy
                        </button>
                        <button type="submit" disabled={loading}>
                            {loading ? (createMode === 'import' ? 'Đang import...' : 'Đang tạo...') : (createMode === 'import' ? 'Import' : 'Tạo')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePagePopup;