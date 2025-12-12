import React, { useEffect, useRef } from 'react';
import GrapesJS from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import 'grapesjs-preset-webpage';
import api from '../../utils/api';

const EditorModal = ({ showEditorModal, setShowEditorModal, editingPage, handleSavePage }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (showEditorModal && editingPage) {
            const editor = GrapesJS.init({
                container: '#gjs-editor',
                fromElement: true,
                height: '600px',
                width: '100%',
                plugins: ['gjs-preset-webpage'],
                storageManager: false,
                assetManager: { upload: false },
            });

            api
                .get(`/api/pages/${editingPage.id}/content`)
                .then((response) => {
                    editor.setComponents(response.data.html);
                    editor.setStyle(response.data.css);
                })
                .catch((err) => {
                    console.error('Editor load error:', err);
                });

            editorRef.current = editor;

            return () => {
                editor.destroy();
                editorRef.current = null;
            };
        }
    }, [showEditorModal, editingPage]);

    return (
        showEditorModal && (
            <div className="modal">
                <div className="modal-content">
                    <h2>Chỉnh sửa Landing Page: {editingPage?.name}</h2>
                    <div id="gjs-editor" style={{ height: '600px', border: '1px solid #ccc' }}></div>
                    <div className="modal-actions">
                        <button onClick={handleSavePage} className="save-btn">Lưu</button>
                        <button onClick={() => setShowEditorModal(false)} className="cancel-btn">Hủy</button>
                    </div>
                </div>
            </div>
        )
    );
};

export default EditorModal;