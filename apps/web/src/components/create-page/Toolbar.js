import React, { useState } from 'react';
import logo from "../../assets/logo.png";
import '../../styles/Toolbar.css';


const Toolbar = ({
                     onSave,
                     onPreview,
                     onDeploy, // Deploy to AWS CloudFront
                     onImport,
                     onGenerateCode,
                     viewMode,
                     onViewModeChange,
                     onUndo,
                     onRedo,
                     canUndo,
                     canRedo,
                     pageData,
                     onSelectElement,
                     selectedIds = [], // Thêm selectedIds
                     selectedElement,
                     onShowAddSectionGuide,
                     onToggleVisibility, // Thêm handlers cho layer actions
                     onToggleLock,
                     onDeleteElement,
                     onAIContentGenerator, // AI Content Generator
                     onAIPageAnalyzer // AI Page Analyzer
                 }) => {
    const [showLayers, setShowLayers] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };


    const handleViewModeChange = (mode) => {
        console.log('Thay đổi chế độ xem thành:', mode);
        if (typeof onViewModeChange === 'function') {
            onViewModeChange(mode);
        } else {
            console.error('onViewModeChange không phải là hàm');
        }
    };



    return (
        <div className="lpb-toolbar-container">
            <div className="lpb-toolbar-inner">
                <div className="lpb-toolbar-left">
                    <img src={logo} alt="Logo" className="logo-image" />
                </div>
                <div className="lpb-toolbar-right">
                    <button
                        onClick={onShowAddSectionGuide}
                        className="lpb-toolbar-action-btn"
                    >
                        <i className="fas fa-plus"></i> Thêm Section
                    </button>

                    {/* AI Features */}
                    <button
                        onClick={onAIContentGenerator}
                        className="lpb-toolbar-action-btn lpb-ai-btn"
                        title="AI Content Generator"
                    >
                        <i className="fas fa-magic"></i> AI Nội dung
                    </button>
                    <button
                        onClick={onAIPageAnalyzer}
                        className="lpb-toolbar-action-btn lpb-ai-btn"
                        title="AI Page Analyzer"
                    >
                        <i className="fas fa-brain"></i> AI Phân tích
                    </button>

                    <button onClick={handleImportClick} className="lpb-toolbar-action-btn" title="Import .iuhpage">
                        <i className="fas fa-file-import"></i> Import
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".iuhpage"
                        onChange={onImport}
                        style={{ display: 'none' }}
                    />
                    <button onClick={onUndo} className="lpb-toolbar-action-btn" disabled={!canUndo}>
                        <i className="fas fa-undo"></i> Undo
                    </button>
                    <button onClick={onRedo} className="lpb-toolbar-action-btn" disabled={!canRedo}>
                        <i className="fas fa-redo"></i> Redo
                    </button>
                    <button onClick={onPreview} className="lpb-toolbar-action-btn">
                        <i className="fas fa-eye"></i> Xem trước
                    </button>
                    <button onClick={onSave} className="lpb-toolbar-action-btn">
                        <i className="fas fa-save"></i> Lưu
                    </button>
                    {onDeploy && (
                        <button
                            onClick={onDeploy}
                            className="lpb-toolbar-action-btn lpb-deploy-btn"
                            title="Deploy to AWS CloudFront"
                        >
                            <i className="fas fa-cloud-upload-alt"></i> Deploy
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Toolbar;