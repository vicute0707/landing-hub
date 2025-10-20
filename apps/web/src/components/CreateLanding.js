import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'react-toastify';
import Canvas from '../components/create-page/Canvas';
import ComponentLibrary from '../components/create-page/ComponentLibrary';
import PropertiesPanel from '../components/create-page/PropertiesPanel';
import ElementPropertiesPanel from '../components/create-page/properties/ElementPropertiesPanel';
import ButtonPropertiesPanel from './create-page/properties/ButtonPropertiesPanel';
import IconPropertiesPanel from './create-page/properties/IconPropertiesPanel';
import ImagePropertiesPanel from './create-page/properties/ImagePropertiesPanel';
import Toolbar from './create-page/Toolbar';
import ResponsiveToolbar from './create-page/ResponsiveToolbar';
import SectionPopup from '../components/create-page/SectionPopup';
import LayerManager from './create-page/LayerManager';
import api from '@landinghub/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { parseHTMLToPageData, renderStaticHTML } from '../utils/pageUtils';
import { syncElementBetweenModes } from '../utils/responsiveSync';
import { ErrorBoundary } from './create-page/ErrorBoundary';
import DogLoader from './Loader'; // Import the DogLoader component
import '../styles/CreateLanding.css';
import PreviewModal from '../components/PreviewModal'; // Import PreviewModal


// Constants
const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_BACKGROUND = '#ffffff';

// Custom hook để quản lý auth
const useAuth = (navigate) => {
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Vui lòng đăng nhập để tiếp tục');
            navigate('/auth');
            return;
        }
        try {
            const decoded = jwtDecode(token);
            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < currentTime) {
                localStorage.removeItem('token');
                toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                navigate('/auth');
                return;
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (err) {
            console.error('Error decoding token:', err);
            toast.error('Phiên đăng nhập không hợp lệ');
            navigate('/auth');
        }
    }, [navigate]);
};

// Custom hook để quản lý page content
const usePageContent = (pageId, navigate, setPageData, setHistory, setHistoryIndex, setIsLoading) => {
    useEffect(() => {
        if (!pageId || !pageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            toast.error('ID trang không hợp lệ. Vui lòng kiểm tra lại.');
            navigate('/pages');
            return;
        }

        const fetchPageContent = async () => {
            setIsLoading(true);
            try {
                const response = await api.get(`/api/pages/${pageId}/content`);
                if (response.data.success) {
                    const { pageData: backendPageData, html } = response.data;
                    let finalPageData = backendPageData || (html ? parseHTMLToPageData(html) : {
                        canvas: { width: DEFAULT_CANVAS_WIDTH, height: 'auto', background: DEFAULT_CANVAS_BACKGROUND },
                        elements: [],
                        meta: { created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                    });
                    setPageData(finalPageData);
                    setHistory([finalPageData]);
                    setHistoryIndex(0);
                    toast.success('Tải trang thành công!');
                } else {
                    throw new Error(response.data.error || 'Không thể tải trang');
                }
            } catch (error) {
                console.error('Lỗi khi lấy nội dung trang:', error);
                toast.error('Lỗi khi lấy nội dung trang: ' + (error.response?.data?.error || error.message));
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/auth');
                } else {
                    navigate('/pages');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchPageContent();
    }, [pageId, navigate, setPageData, setHistory, setHistoryIndex, setIsLoading]);
};

const CreateLanding = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const pageId = searchParams.get('id');
    const [pageData, setPageData] = useState({
        canvas: { width: DEFAULT_CANVAS_WIDTH, height: 'auto', background: DEFAULT_CANVAS_BACKGROUND },
        elements: [],
        meta: { created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    });
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedChildId, setSelectedChildId] = useState(null);
    const [viewMode, setViewMode] = useState('desktop');
    const [zoomLevel, setZoomLevel] = useState(100);
    const [gridSize, setGridSize] = useState(10);
    const [showGrid, setShowGrid] = useState(true);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // New state for save operation
    const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
    const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [guideLine, setGuideLine] = useState({ show: true, y: 0 });
    const [previewHtml, setPreviewHtml] = useState(''); // State for preview HTML
    useAuth(navigate);
    usePageContent(pageId, navigate, setPageData, setHistory, setHistoryIndex, setIsLoading);

    // Handle canvas height update
    const handleUpdateCanvasHeight = useCallback((newHeight) => {
        setPageData((prev) => ({
            ...prev,
            canvas: { ...prev.canvas, height: newHeight },
            meta: { ...prev.meta, updated_at: new Date().toISOString() }
        }));
    }, []);

    // Toggle handlers
    const handleToggleLibrary = useCallback(() => setIsLibraryCollapsed((prev) => !prev), []);
    const handleShowAddSectionPopup = useCallback((e) => {
        if (e) e.stopPropagation();
        setShowPopup(true);
        setGuideLine((prev) => ({ ...prev, show: false }));
    }, []);

    // Visibility & Lock
    const handleToggleVisibility = useCallback((elementId, childId, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) => {
                    if (el.id === elementId) {
                        if (childId) {
                            return {
                                ...el,
                                children: el.children.map((child) =>
                                    child.id === childId ? { ...child, visible: !child.visible } : child
                                ),
                            };
                        }
                        return { ...el, visible: !el.visible };
                    }
                    return el;
                }),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success(childId ? 'Đã cập nhật hiển thị child!' : 'Đã cập nhật hiển thị element!');
    }, [history, historyIndex]);

    const handleToggleLock = useCallback((elementId, childId, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) => {
                    if (el.id === elementId) {
                        if (childId) {
                            return {
                                ...el,
                                children: el.children.map((child) =>
                                    child.id === childId ? { ...child, locked: !child.locked } : child
                                ),
                            };
                        }
                        return { ...el, locked: !el.locked };
                    }
                    return el;
                }),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success(childId ? 'Đã cập nhật khóa child!' : 'Đã cập nhật khóa element!');
    }, [history, historyIndex]);

    // View mode change with responsive sync
    const handleViewModeChange = useCallback((mode) => {
        setViewMode(mode);
        setPageData((prev) => {
            const canvasWidth = mode === 'desktop' ? 1200 : mode === 'tablet' ? 768 : 375;

            // Sync elements để đảm bảo responsive data được cập nhật
            const syncedElements = prev.elements.map((element) => {
                // Nếu element chưa có responsive data, sync ngay
                if (!element.position?.mobile || !element.position?.tablet) {
                    return syncElementBetweenModes(element, 'desktop');
                }
                return element;
            });

            const newPageData = {
                ...prev,
                canvas: { ...prev.canvas, width: canvasWidth },
                elements: syncedElements,
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });

        const modeLabel = mode === 'desktop' ? 'Desktop' : mode === 'tablet' ? 'Tablet' : 'Mobile';
        toast.info(`Đã chuyển sang chế độ ${modeLabel}`);
    }, [history, historyIndex]);

    // Add section
    const handleAddSection = useCallback((section) => {
        const lastSectionY = pageData.elements
            .filter((el) => el.type === 'section')
            .reduce((maxY, el) => Math.max(maxY, (el.position?.[viewMode]?.y || 0) + (el.size?.height || 400)), 0);
        const newElement = {
            id: `${section.id}-${Date.now()}`,
            type: section.json.type,
            componentData: JSON.parse(JSON.stringify(section.json.componentData || {})),
            position: {
                [viewMode]: { x: section.json.type === 'popup' ? 100 : 0, y: section.json.type === 'popup' ? 100 : lastSectionY },
                desktop: { x: section.json.type === 'popup' ? 100 : 0, y: section.json.type === 'popup' ? 100 : lastSectionY },
                tablet: { x: section.json.type === 'popup' ? 100 : 0, y: section.json.type === 'popup' ? 100 : lastSectionY },
                mobile: { x: section.json.type === 'popup' ? 100 : 0, y: section.json.type === 'popup' ? 100 : lastSectionY },
            },
            size: { ...section.json.size, width: viewMode === 'mobile' ? 375 : section.json.type === 'popup' ? 600 : 1200 },
            styles: JSON.parse(JSON.stringify(section.json.styles || {})),
            children: JSON.parse(JSON.stringify(section.json.children || [])),
            visible: true,
            locked: false
        };
        setPageData((prev) => {
            const newElements = [...prev.elements, newElement];
            const newCanvasHeight = section.json.type === 'section' ? lastSectionY + (section.json.size?.height || 400) : prev.canvas.height;
            const newPageData = {
                ...prev,
                elements: newElements,
                canvas: { ...prev.canvas, height: Math.max(prev.canvas.height || 0, newCanvasHeight) },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        if (section.json.type === 'section') {
            setGuideLine({ show: true, y: lastSectionY + (section.json.size?.height || 400) });
        }
        toast.success(`Đã thêm ${section.json.type} mới!`);
        setShowPopup(false);
    }, [pageData.elements, viewMode, history, historyIndex]);

    // Add element
    const handleAddElement = useCallback((element) => {
        const newId = element.id || `${element.type}-${Date.now()}`;
        const lastElement = pageData.elements
            .filter((el) => el.type === 'section')
            .sort((a, b) => (b.position?.[viewMode]?.y || 0) - (a.position?.[viewMode]?.y || 0))[0];
        const lastY = lastElement?.position?.[viewMode]?.y || 0;
        const lastHeight = lastElement?.size?.height || 0;
        const lastMarginBottom = parseFloat(lastElement?.styles?.marginBottom || '0') || 0;
        const newY = lastY + lastHeight + lastMarginBottom;
        const newElement = {
            ...element,
            id: newId,
            position: {
                desktop: { x: 0, y: newY },
                tablet: { x: 0, y: newY },
                mobile: { x: 0, y: newY },
            },
            styles: {
                ...element.styles,
                margin: '0',
                padding: '0',
            },
        };
        setPageData((prev) => {
            const newElements = [...prev.elements, newElement];
            const newCanvasHeight = newY + (newElement.size?.height || 400);
            const newPageData = {
                ...prev,
                elements: newElements,
                canvas: { ...prev.canvas, height: Math.max(prev.canvas.height || 0, newCanvasHeight) },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success('Đã thêm phần tử!');
    }, [pageData, viewMode, history, historyIndex]);

    // Add child
    const handleAddChild = useCallback((parentId, newChild) => {
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) => {
                    if (el.id === parentId) {
                        return {
                            ...el,
                            children: [...(el.children || []), {
                                ...newChild,
                                position: {
                                    desktop: newChild.position?.desktop || { x: 0, y: 0 },
                                    tablet: newChild.position?.tablet || { x: 0, y: 0 },
                                    mobile: newChild.position?.mobile || { x: 0, y: 0 },
                                },
                                styles: {
                                    ...newChild.styles,
                                    zIndex: 2,
                                },
                            }],
                        };
                    }
                    return el;
                }),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success('Đã thêm thành phần con!');
    }, [history, historyIndex]);

    // Delete element with confirmation
    const handleDeleteElement = useCallback((id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Bạn có chắc muốn xóa section này?')) return;
        setPageData((prev) => {
            const newElements = prev.elements.filter((el) => el.id !== id);
            let currentY = 0;
            const updatedElements = newElements.map((el) => {
                if (el.type === 'section') {
                    const updatedElement = { ...el, position: { ...el.position, [viewMode]: { ...el.position[viewMode], y: currentY } } };
                    currentY += el.size?.height || 400;
                    return updatedElement;
                }
                return el;
            });
            const newPageData = {
                ...prev,
                elements: updatedElements,
                canvas: { ...prev.canvas, height: Math.max(currentY + 100, 100) },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        setSelectedIds((prev) => prev.filter((selId) => selId !== id));
        setSelectedChildId(null);
        setGuideLine((prev) => ({
            ...prev,
            y: pageData.elements
                .filter((el) => el.type === 'section')
                .reduce((maxY, el) => Math.max(maxY, (el.position?.[viewMode]?.y || 0) + (el.size?.height || 400)), 0),
        }));
        toast.success('Đã xóa section!');
    }, [historyIndex, pageData.elements, viewMode]);

    // Delete child
    const handleDeleteChild = useCallback((parentId, childId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Bạn có chắc muốn xóa thành phần con này?')) return;
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) => {
                    if (el.id === parentId) {
                        return {
                            ...el,
                            children: el.children.filter((child) => child.id !== childId),
                        };
                    }
                    return el;
                }),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        setSelectedChildId(null);
        toast.success('Đã xóa thành phần con!');
    }, [historyIndex]);

    // Move element up
    const handleMoveElementUp = useCallback((id, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const index = prev.elements.findIndex((el) => el.id === id);
            if (index <= 0) return prev;
            const newElements = [...prev.elements];
            [newElements[index - 1], newElements[index]] = [newElements[index], newElements[index - 1]];
            let currentY = 0;
            const updatedElements = newElements.map((el) => {
                if (el.type === 'section') {
                    const height = el.size?.height || 400;
                    const updatedElement = {
                        ...el,
                        position: { ...el.position, [viewMode]: { x: 0, y: currentY } },
                    };
                    currentY += height;
                    return updatedElement;
                }
                return el;
            });
            const newPageData = {
                ...prev,
                elements: updatedElements,
                canvas: { ...prev.canvas, height: currentY + 100 },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        setGuideLine((prev) => ({
            ...prev,
            y: pageData.elements
                .filter((el) => el.type === 'section')
                .reduce((maxY, el) => Math.max(maxY, (el.position?.[viewMode]?.y || 0) + (el.size?.height || 400)), 0),
        }));
        toast.success('Đã di chuyển section lên!');
    }, [historyIndex, viewMode, pageData.elements]);

    // Move element down
    const handleMoveElementDown = useCallback((id, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const index = prev.elements.findIndex((el) => el.id === id);
            if (index >= prev.elements.length - 1) return prev;
            const newElements = [...prev.elements];
            [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
            let currentY = 0;
            const updatedElements = newElements.map((el) => {
                if (el.type === 'section') {
                    const height = el.size?.height || 400;
                    const updatedElement = {
                        ...el,
                        position: { ...el.position, [viewMode]: { x: 0, y: currentY } },
                    };
                    currentY += height;
                    return updatedElement;
                }
                return el;
            });
            const newPageData = {
                ...prev,
                elements: updatedElements,
                canvas: { ...prev.canvas, height: currentY + 100 },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        setGuideLine((prev) => ({
            ...prev,
            y: pageData.elements
                .filter((el) => el.type === 'section')
                .reduce((maxY, el) => Math.max(maxY, (el.position?.[viewMode]?.y || 0) + (el.size?.height || 400)), 0),
        }));
        toast.success('Đã di chuyển section xuống!');
    }, [historyIndex, viewMode, pageData.elements]);

    // Select element
    const handleSelectElement = useCallback((ids, append = false) => {
        if (Array.isArray(ids)) {
            setSelectedIds(append ? [...new Set([...selectedIds, ...ids])] : ids);
        } else {
            setSelectedIds(append ? [...new Set([...selectedIds, ids])] : [ids]);
        }
        setSelectedChildId(null);
    }, [selectedIds]);

    // Select child
    const handleSelectChild = useCallback((parentId, childId) => {
        if (!parentId) {
            setSelectedIds([]);
            setSelectedChildId(null);
            return;
        }
        if (!pageData.elements.find((el) => el.id === parentId)) {
            setSelectedIds([]);
            setSelectedChildId(null);
            return;
        }
        setSelectedIds([parentId]);
        setSelectedChildId(childId);
    }, [pageData.elements]);

    // Update position
    const handleUpdatePosition = useCallback((id, position, mode, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) =>
                    el.id === id
                        ? { ...el, position: mode === 'replace' ? position : { ...el.position, ...position } }
                        : el
                ),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
    }, [historyIndex]);

    // Update size
    const handleUpdateSize = useCallback((id, size, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) =>
                    el.id === id ? { ...el, size } : el
                ),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
    }, [historyIndex]);

    // Update canvas
    const handleUpdateCanvas = useCallback((canvasUpdates) => {
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                canvas: { ...prev.canvas, ...canvasUpdates },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success('Đã cập nhật cài đặt canvas!');
    }, [historyIndex]);

    // Edit element
    const handleEditElement = useCallback((updatedElement, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) =>
                    el.id === selectedIds[0]
                        ? updatedElement.isChild
                            ? { ...el, children: el.children.map((child) => child.id === selectedChildId ? { ...child, ...updatedElement.json } : child) }
                            : { ...el, ...updatedElement.json }
                        : el
                ),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success('Đã cập nhật phần tử!');
    }, [historyIndex, selectedIds, selectedChildId]);

    // Duplicate element
    const handleDuplicateElement = useCallback((id, e) => {
        if (e) e.stopPropagation();
        const element = pageData.elements.find((el) => el.id === id);
        if (element) {
            const newElement = {
                ...element,
                id: `${element.id}-${Date.now()}`,
                position: {
                    desktop: { x: (element.position.desktop?.x || 0) + 10, y: (element.position.desktop?.y || 0) + 10 },
                    tablet: { x: (element.position.tablet?.x || 0) + 10, y: (element.position.tablet?.y || 0) + 10 },
                    mobile: { x: (element.position.mobile?.x || 0) + 10, y: (element.position.mobile?.y || 0) + 10 },
                },
            };
            setPageData((prev) => {
                const newPageData = {
                    ...prev,
                    elements: [...prev.elements, newElement],
                    meta: { ...prev.meta, updated_at: new Date().toISOString() }
                };
                setHistory([...history.slice(0, historyIndex + 1), newPageData]);
                setHistoryIndex(historyIndex + 1);
                return newPageData;
            });
            toast.success('Đã sao chép phần tử!');
        }
    }, [historyIndex, pageData.elements]);

    // Group elements
    const handleGroupElements = useCallback((ids, e) => {
        if (e) e.stopPropagation();
        const groupId = `group-${Date.now()}`;
        setPageData((prev) => {
            const selectedElements = prev.elements.filter((el) => ids.includes(el.id));
            if (selectedElements.length === 0) return prev;
            const newPageData = {
                ...prev,
                elements: [
                    ...prev.elements.filter((el) => !ids.includes(el.id)),
                    {
                        id: groupId,
                        type: 'group',
                        position: {
                            desktop: { x: 0, y: 0 },
                            tablet: { x: 0, y: 0 },
                            mobile: { x: 0, y: 0 },
                        },
                        size: { width: 300, height: 200 },
                        styles: {
                            borderRadius: '4px',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            zIndex: 10,
                        },
                        children: selectedElements.map((el) => ({
                            ...el,
                            position: {
                                desktop: { x: 0, y: 0 },
                                tablet: { x: 0, y: 0 },
                                mobile: { x: 0, y: 0 },
                            },
                        })),
                    },
                ],
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        setSelectedIds([groupId]);
        toast.success('Đã nhóm các phần tử!');
    }, [historyIndex]);

    // Update child position
    const handleUpdateChildPosition = useCallback((parentId, childId, newPosition, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) => {
                    if (el.id === parentId) {
                        return {
                            ...el,
                            children: el.children.map((child) =>
                                child.id === childId
                                    ? { ...child, position: { ...child.position, [viewMode]: newPosition } }
                                    : child
                            ),
                        };
                    }
                    return el;
                }),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success('Đã cập nhật vị trí thành phần con!');
    }, [historyIndex, viewMode]);

    // Move child
    const handleMoveChild = useCallback((sourceParentId, childId, targetParentId, newElementOrPosition, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            let newElements = [...prev.elements];
            let childElement;

            if (sourceParentId) {
                newElements = newElements.map((el) => {
                    if (el.id === sourceParentId) {
                        const childIndex = el.children.findIndex((child) => child.id === childId);
                        if (childIndex !== -1) {
                            childElement = {
                                ...el.children[childIndex],
                                position: {
                                    ...el.children[childIndex].position,
                                    [viewMode]: typeof newElementOrPosition === 'object' && newElementOrPosition.position
                                        ? newElementOrPosition.position[viewMode]
                                        : newElementOrPosition,
                                },
                            };
                            return { ...el, children: el.children.filter((child) => child.id !== childId) };
                        }
                    }
                    return el;
                });
            } else {
                const childIndex = newElements.findIndex((el) => el.id === childId);
                if (childIndex !== -1) {
                    childElement = {
                        ...newElements[childIndex],
                        position: {
                            ...newElements[childIndex].position,
                            [viewMode]: typeof newElementOrPosition === 'object' && newElementOrPosition.position
                                ? newElementOrPosition.position[viewMode]
                                : newElementOrPosition,
                        },
                    };
                    newElements.splice(childIndex, 1);
                }
            }

            if (targetParentId) {
                newElements = newElements.map((el) => {
                    if (el.id === targetParentId) {
                        return { ...el, children: [...(el.children || []), childElement] };
                    }
                    return el;
                });
            } else {
                newElements.push(
                    typeof newElementOrPosition === 'object' && newElementOrPosition.id
                        ? newElementOrPosition
                        : childElement
                );
            }

            const newPageData = {
                ...prev,
                elements: newElements,
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success(targetParentId ? 'Đã di chuyển thành phần con!' : 'Đã chuyển thành phần con thành phần tử độc lập!');
    }, [historyIndex, viewMode]);

    // Update children
    const handleUpdateChildren = useCallback((parentId, dragIndex, dropIndex, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) => {
                    if (el.id === parentId) {
                        const newChildren = [...(el.children || [])];
                        if (dragIndex >= 0 && dragIndex < newChildren.length && dropIndex >= 0 && dropIndex < newChildren.length) {
                            const [movedChild] = newChildren.splice(dragIndex, 1);
                            newChildren.splice(dropIndex, 0, movedChild);
                            return { ...el, children: newChildren };
                        }
                    }
                    return el;
                }),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success('Đã sắp xếp lại thành phần con!');
    }, [historyIndex]);

    // Undo
    const handleUndo = useCallback(() => {
        if (historyIndex >= 0) {
            setPageData(history[historyIndex]);
            setHistoryIndex(historyIndex - 1);
            toast.info('Đã hoàn tác!');
        }
    }, [historyIndex]);

    // Redo
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setPageData(history[historyIndex + 1]);
            setHistoryIndex(historyIndex + 1);
            toast.info('Đã khôi phục!');
        }
    }, [historyIndex, history.length]);

    // Auto save
    const handleAutoSave = useCallback(async () => {
        setIsSaving(true); // Show DogLoader during autosave
        try {
            const htmlContent = renderStaticHTML(pageData);
            await api.post('/api/pages/autosave', { html: htmlContent, pageId });
            toast.success('Đã tự động lưu bản nháp!');
        } catch (error) {
            toast.error('Lỗi khi tự động lưu: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSaving(false); // Hide DogLoader
        }
    }, [pageId, pageData]);

    // Save
    const handleSave = useCallback(async () => {
        if (!pageId) {
            toast.error('Không tìm thấy ID trang.');
            return;
        }
        setIsSaving(true); // Show DogLoader during save
        try {
            const htmlContent = renderStaticHTML(pageData);
            const response = await api.put(`/api/pages/${pageId}`, { html: htmlContent, pageData });
            if (response.data.success) {
                toast.success(`Lưu trang thành công! (${pageData.elements.length} phần tử)`);
                if (!response.data.page.screenshot_url) {
                    toast.warn('Ảnh chụp màn hình chưa được tạo. Đang thử tạo lại...');
                    try {
                        await api.get(`/api/pages/regenerate-screenshots`);
                        toast.success('Đã yêu cầu tạo lại ảnh chụp màn hình!');
                    } catch (err) {
                        console.error('Error regenerating screenshots:', err);
                        toast.error('Không thể tạo lại ảnh chụp màn hình: ' + (err.response?.data?.error || err.message));
                    }
                }
                // Navigate back to page list to refresh
                navigate('/pages');
            }
        } catch (error) {
            console.error('Lỗi khi lưu trang:', error);
            toast.error('Lỗi khi lưu trang: ' + (error.response?.data?.error || error.message));
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/auth');
            }
        } finally {
            setIsSaving(false); // Hide DogLoader
        }
    }, [pageId, navigate, pageData]);

    // Preview
    const handlePreview = useCallback(() => {
        const htmlContent = renderStaticHTML(pageData);
        setPreviewHtml(htmlContent);
        setShowPreview(true);
    }, [pageData]);

    // Generate code
    const handleGenerateCode = useCallback(async () => {
        if (!pageId) {
            toast.error('Không tìm thấy ID trang để triển khai.');
            return;
        }
        setIsSaving(true); // Show DogLoader during generate code
        try {
            const htmlContent = renderStaticHTML(pageData);
            await api.put(`/api/pages/${pageId}`, { html: htmlContent });
            const response = await api.post(`/api/pages/${pageId}/publish`);
            if (response.data.success && response.data.page?.url) {
                toast.success(`Triển khai thành công! Truy cập tại: ${response.data.page.url}`);
                // Check if screenshot was generated after publish
                if (!response.data.page.screenshot_url) {
                    toast.warn('Ảnh chụp màn hình chưa được tạo. Đang thử tạo lại...');
                    try {
                        await api.get(`/api/pages/regenerate-screenshots`);
                        toast.success('Đã yêu cầu tạo lại ảnh chụp màn hình!');
                    } catch (err) {
                        console.error('Error regenerating screenshots:', err);
                        toast.error('Không thể tạo lại ảnh chụp màn hình: ' + (err.response?.data?.error || err.message));
                    }
                }
                // Navigate back to page list to refresh
                navigate('/pages');
            } else {
                toast.error('Triển khai thất bại: ' + (response.data.error || 'Lỗi không xác định'));
            }
        } catch (error) {
            console.error('Lỗi khi triển khai:', error);
            toast.error('Lỗi khi triển khai trang: ' + (error.response?.data?.error || error.message));
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/auth');
            }
        } finally {
            setIsSaving(false); // Hide DogLoader
        }
    }, [pageId, navigate, pageData]);

    // Save template
    const handleSaveTemplate = useCallback((id) => {
        const element = pageData.elements.find((el) => el.id === id);
        if (element) {
            toast.success('Đã lưu template!');
        }
    }, [pageData.elements]);

    // Update visible popups
    const handleUpdateVisiblePopups = useCallback((newVisiblePopups) => {
        setPageData((prev) => ({
            ...prev,
            visiblePopups: newVisiblePopups,
            meta: { ...prev.meta, updated_at: new Date().toISOString() }
        }));
    }, []);

    const selectedElement = selectedChildId
        ? pageData.elements.find((el) => el.id === selectedIds[0])?.children?.find((child) => child.id === selectedChildId)
            ? { json: pageData.elements.find((el) => el.id === selectedIds[0]).children.find((child) => child.id === selectedChildId), isChild: true }
            : null
        : pageData.elements.find((el) => el.id === selectedIds[0])
            ? { json: pageData.elements.find((el) => el.id === selectedIds[0]), isChild: false }
            : null;

    // Show DogLoader for both initial loading and save operations
    if (isLoading || isSaving) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
                <DogLoader />
            </div>
        );
    }

    const renderPropertiesPanel = () => {
        if (!selectedElement) {
            return (
                <PropertiesPanel
                    selectedElement={null}
                    onUpdateElement={handleEditElement}
                    onUpdateCanvas={handleUpdateCanvas}
                    isCollapsed={isPropertiesCollapsed}
                    onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                    pageData={pageData}
                    className="w-80 bg-white shadow-lg p-4"
                />
            );
        }

        const { type } = selectedElement.json;
        if (type === 'section' || type === 'popup') {
            return (
                <PropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={handleEditElement}
                    onUpdateCanvas={handleUpdateCanvas}
                    isCollapsed={isPropertiesCollapsed}
                    onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                    pageData={pageData}
                    className="w-80 bg-white shadow-lg p-4"
                />
            );
        }
        if (type === 'heading' || type === 'paragraph' || type === 'gallery') {
            return (
                <ElementPropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={handleEditElement}
                    isCollapsed={isPropertiesCollapsed}
                    onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                    pageId={pageId}
                    className="w-80 bg-white shadow-lg p-4"
                />
            );
        }
        if (type === 'button') {
            return (
                <ButtonPropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={handleEditElement}
                    isCollapsed={isPropertiesCollapsed}
                    onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                    allElements={pageData.elements}
                    className="w-80 bg-white shadow-lg p-4"
                />
            );
        }
        if (type === 'icon') {
            return (
                <IconPropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={handleEditElement}
                    isCollapsed={isPropertiesCollapsed}
                    onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                    pageId={pageId}
                    className="w-80 bg-white shadow-lg p-4"
                />
            );
        }
        if (type === 'image') {
            return (
                <ImagePropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={handleEditElement}
                    isCollapsed={isPropertiesCollapsed}
                    onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                    pageId={pageId}
                    className="w-80 bg-white shadow-lg p-4"
                />
            );
        }
        return (
            <PropertiesPanel
                selectedElement={selectedElement}
                onUpdateElement={handleEditElement}
                onUpdateCanvas={handleUpdateCanvas}
                isCollapsed={isPropertiesCollapsed}
                onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                pageData={pageData}
                className="w-80 bg-white shadow-lg p-4"
            />
        );
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="flex h-screen bg-gray-100">
                <ErrorBoundary>
                    <link
                        rel="stylesheet"
                        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                    />
                    <ComponentLibrary
                        isCollapsed={isLibraryCollapsed}
                        onToggle={handleToggleLibrary}
                        onAddElement={handleAddElement}
                        onAddChild={handleAddChild}
                        pageData={pageData}
                        className="w-64 bg-white shadow-lg"
                    />
                </ErrorBoundary>
                <div className="flex-1 flex flex-col">
                    <ErrorBoundary>
                        <Toolbar
                            onSave={handleSave}
                            onAutoSave={handleAutoSave}
                            onPreview={handlePreview}
                            onGenerateCode={handleGenerateCode}
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            canUndo={historyIndex >= 0}
                            canRedo={historyIndex < history.length - 1}
                            zoomLevel={zoomLevel}
                            onZoom={(direction) => setZoomLevel(direction === 'in' ? Math.min(200, zoomLevel + 10) : Math.max(50, zoomLevel - 10))}
                            onToggleGrid={() => setShowGrid(!showGrid)}
                            showGrid={showGrid}
                            gridSize={gridSize}
                            onSetGridSize={setGridSize}
                            pageData={pageData}
                            selectedElement={selectedElement}
                            selectedIds={selectedIds}
                            onSelectElement={handleSelectElement}
                            onToggleVisibility={handleToggleVisibility}
                            onToggleLock={handleToggleLock}
                            onDeleteElement={handleDeleteElement}
                            onShowAddSectionGuide={handleShowAddSectionPopup}
                            className="bg-white p-4 shadow-sm"
                        />
                    </ErrorBoundary>
                    <ErrorBoundary>
                        <ResponsiveToolbar
                            viewMode={viewMode}
                            onViewModeChange={handleViewModeChange}
                            pageData={pageData}
                            onUpdatePageData={(newData) => {
                                setPageData(newData);
                                setHistory([...history.slice(0, historyIndex + 1), newData]);
                                setHistoryIndex(historyIndex + 1);
                            }}
                        />
                    </ErrorBoundary>
                    <ErrorBoundary>
                        <Canvas
                            pageData={pageData}
                            selectedIds={selectedIds}
                            onSelectElement={handleSelectElement}
                            onUpdatePosition={handleUpdatePosition}
                            onUpdateSize={handleUpdateSize}
                            onDeleteElement={handleDeleteElement}
                            onDeleteChild={handleDeleteChild}
                            onAddElement={handleAddElement}
                            onGroupElements={handleGroupElements}
                            viewMode={viewMode}
                            zoomLevel={zoomLevel}
                            gridSize={gridSize}
                            showGrid={showGrid}
                            onEditElement={handleEditElement}
                            onMoveElementUp={handleMoveElementUp}
                            onMoveElementDown={handleMoveElementDown}
                            onSelectChild={handleSelectChild}
                            selectedChildId={selectedChildId}
                            onUpdateChildren={handleUpdateChildren}
                            onAddChild={handleAddChild}
                            onUpdateChildPosition={handleUpdateChildPosition}
                            onMoveChild={handleMoveChild}
                            guideLine={guideLine}
                            onUpdateCanvasHeight={handleUpdateCanvasHeight}
                            onShowAddSectionPopup={handleShowAddSectionPopup}
                            onSaveTemplate={handleSaveTemplate}
                            onToggleVisibility={handleToggleVisibility}
                            onOpenProperties={() => setIsPropertiesCollapsed(false)}
                            onUpdateVisiblePopups={handleUpdateVisiblePopups}
                            className="flex-1 bg-gray-200"
                        />
                    </ErrorBoundary>
                    {showPreview && (
                        <PreviewModal
                            selectedTemplate={{ name: 'Page Preview' }}
                            setShowPreviewModal={setShowPreview}
                            setPreviewHtml={setPreviewHtml}
                            previewHtml={previewHtml}
                            fullScreen={false}
                        />
                    )}
                </div>
                <ErrorBoundary>
                    {renderPropertiesPanel()}
                </ErrorBoundary>
                <SectionPopup
                    showPopup={showPopup}
                    setShowPopup={setShowPopup}
                    viewMode={viewMode}
                    handleAddSection={handleAddSection}
                    className="z-50"
                />
                <LayerManager
                    pageData={pageData}
                    selectedIds={selectedIds}
                    onSelectElement={handleSelectElement}
                    onToggleLock={handleToggleLock}
                    onDeleteElement={handleDeleteElement}
                    onDeleteChild={handleDeleteChild}
                    viewMode={viewMode}
                    onToggleVisibility={handleToggleVisibility}
                    className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg"
                />
            </div>
        </DndProvider>
    );
};

export default CreateLanding;