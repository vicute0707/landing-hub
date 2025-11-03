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
import IframePropertiesPanel from './create-page/properties/IframePropertiesPanel';
import AdvancedPropertiesPanel from './create-page/properties/AdvancedPropertiesPanel';
import Toolbar from './create-page/Toolbar';
import ResponsiveToolbar from './create-page/ResponsiveToolbar';
import SectionPopup from '../components/create-page/SectionPopup';
import LayerManager from './create-page/LayerManager';
import PopupLayerManager from './create-page/PopupLayerManager';
import api from '@landinghub/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { parseHTMLToPageData, renderStaticHTML } from '../utils/pageUtils';
import { syncElementBetweenModes } from '../utils/responsiveSync';
import { applyMobileVerticalStacking, applySectionMobileStacking } from '../utils/dragDropCore';
import {
    calculateNextSectionY,
    reorderSections,
    calculateCanvasHeight,
    moveSectionUp,
    moveSectionDown,
    deleteSection
} from '../utils/sectionUtils';
import { useKeyboardShortcuts } from '../utils/keyboardShortcuts';
import { ErrorBoundary } from './create-page/ErrorBoundary';
import DogLoader from './Loader'; // Import the DogLoader component
import eventController from '../utils/EventUtils'; // Import eventController for popup events
import '../styles/CreateLanding.css';
import PreviewModal from '../components/PreviewModal'; // Import PreviewModal
import AIContentModal from './create-page/AIContentModal'; // AI Content Generator
import AIPageAnalyzer from './create-page/AIPageAnalyzer'; // AI Page Analyzer


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
    const [clipboard, setClipboard] = useState(null); // Clipboard for copy/paste
    const [isPopupLayerCollapsed, setIsPopupLayerCollapsed] = useState(true); // Popup layer manager state

    // AI Features State
    const [showAIContentModal, setShowAIContentModal] = useState(false);
    const [showAIAnalyzer, setShowAIAnalyzer] = useState(false);
    const [aiElementType, setAIElementType] = useState('paragraph'); // Type for AI content generation

    useAuth(navigate);
    usePageContent(pageId, navigate, setPageData, setHistory, setHistoryIndex, setIsLoading);

    // Subscribe to popup events
    useEffect(() => {
        const handlePopupOpen = ({ popupId }) => {
            console.log('[CreateLanding] Opening popup:', popupId);
            setPageData(prev => ({
                ...prev,
                elements: prev.elements.map(el =>
                    el.id === popupId
                        ? { ...el, visible: true }
                        : el
                )
            }));
            toast.info(`Popup "${popupId}" đã mở`);
        };

        const handlePopupClose = ({ popupId }) => {
            console.log('[CreateLanding] Closing popup:', popupId);
            setPageData(prev => ({
                ...prev,
                elements: prev.elements.map(el =>
                    el.id === popupId
                        ? { ...el, visible: false }
                        : el
                )
            }));
        };

        // Subscribe to events
        const unsubscribeOpen = eventController.subscribe('popup-open', handlePopupOpen);
        const unsubscribeClose = eventController.subscribe('popup-close', handlePopupClose);

        // Cleanup on unmount
        return () => {
            unsubscribeOpen();
            unsubscribeClose();
        };
    }, []);

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

    // View mode change with responsive sync and mobile stacking
    const handleViewModeChange = useCallback((mode) => {
        setViewMode(mode);
        setPageData((prev) => {
            const canvasWidth = mode === 'desktop' ? 1200 : mode === 'tablet' ? 768 : 375;

            // Sync elements để đảm bảo responsive data được cập nhật
            let syncedElements = prev.elements.map((element) => {
                // Always sync to ensure responsive data is up to date
                return syncElementBetweenModes(element, 'desktop');
            });

            // MOBILE: Apply vertical stacking for better mobile layout
            if (mode === 'mobile') {
                // Separate sections and other elements
                const sections = syncedElements.filter(el => el.type === 'section');
                const others = syncedElements.filter(el => el.type !== 'section');

                // Apply mobile stacking to sections (stack children vertically)
                const stackedSections = sections.map(section => {
                    if (section.children && section.children.length > 0) {
                        return applySectionMobileStacking(section, {
                            startY: 20,
                            spacing: 16,
                            padding: 20,
                            viewportWidth: 375
                        });
                    }
                    return section;
                });

                // Apply vertical stacking to other top-level elements (popups don't need stacking)
                const nonPopupOthers = others.filter(el => el.type !== 'popup' && el.type !== 'modal');
                const popups = others.filter(el => el.type === 'popup' || el.type === 'modal');

                const stackedOthers = nonPopupOthers.length > 0
                    ? applyMobileVerticalStacking(nonPopupOthers, {
                        startY: stackedSections.reduce((maxY, section) => {
                            const sectionBottom = (section.position?.mobile?.y || 0) + (section.mobileSize?.height || section.size?.height || 400);
                            return Math.max(maxY, sectionBottom);
                        }, 0) + 20,
                        spacing: 20,
                        padding: 20,
                        viewportWidth: 375,
                        centerHorizontally: true
                    })
                    : nonPopupOthers;

                // Combine: sections first, then stacked others, then popups (unchanged)
                syncedElements = [...stackedSections, ...stackedOthers, ...popups];
            }

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
        toast.info(`Đã chuyển sang chế độ ${modeLabel}${mode === 'mobile' ? ' - Áp dụng vertical stacking' : ''}`);
    }, [history, historyIndex]);

    // Add section
    const handleAddSection = useCallback((section) => {
        // LUÔN tính Y position từ desktop mode để đảm bảo consistency
        const nextY = calculateNextSectionY(pageData.elements);

        // Initialize children with responsive data
        const childrenWithResponsive = (section.json.children || []).map(child => {
            const childElement = {
                ...child,
                position: child.position || {
                    desktop: { x: 0, y: 0, z: 1 },
                    tablet: { x: 0, y: 0, z: 1 },
                    mobile: { x: 0, y: 0, z: 1 },
                },
                size: child.size || { width: 200, height: 50 },
                visible: child.visible !== false,
                locked: child.locked || false,
            };
            // Sync responsive data for child if missing
            return (!childElement.mobileSize || !childElement.tabletSize)
                ? syncElementBetweenModes(childElement, 'desktop')
                : childElement;
        });

        const isPopup = section.json.type === 'popup';
        const baseElement = {
            id: `${section.id}-${Date.now()}`,
            type: section.json.type,
            componentData: JSON.parse(JSON.stringify(section.json.componentData || {})),
            position: {
                // Sections: x=0, y=nextY (stacked vertically)
                // Popups: centered x=100, y=100, high z-index
                desktop: { x: isPopup ? 100 : 0, y: isPopup ? 100 : nextY, z: isPopup ? 1001 : 1 },
                tablet: { x: isPopup ? 100 : 0, y: isPopup ? 100 : nextY, z: isPopup ? 1001 : 1 },
                mobile: { x: isPopup ? 100 : 0, y: isPopup ? 100 : nextY, z: isPopup ? 1001 : 1 },
            },
            size: section.json.size || {
                width: isPopup ? 600 : 1200,
                height: section.json.size?.height || 400
            },
            mobileSize: section.json.mobileSize || (isPopup ? { width: 340, height: section.json.size?.height || 400 } : { width: 375, height: section.json.size?.height || 400 }),
            tabletSize: section.json.tabletSize || (isPopup ? { width: 600, height: section.json.size?.height || 400 } : { width: 768, height: section.json.size?.height || 400 }),
            styles: JSON.parse(JSON.stringify(section.json.styles || {})),
            responsiveStyles: section.json.responsiveStyles || {},
            children: childrenWithResponsive,
            visible: true,
            locked: false
        };

        // ALWAYS sync to ensure all responsive data is complete and consistent
        const newElement = syncElementBetweenModes(baseElement, 'desktop');

        setPageData((prev) => {
            const newElements = [...prev.elements, newElement];
            const newCanvasHeight = calculateCanvasHeight(newElements);
            const newPageData = {
                ...prev,
                elements: newElements,
                canvas: { ...prev.canvas, height: newCanvasHeight },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });

        if (!isPopup) {
            const newHeight = section.json.size?.height || 400;
            setGuideLine({ show: true, y: nextY + newHeight });
        }
        toast.success(`Đã thêm ${section.json.type} mới!`);
        setShowPopup(false);
    }, [pageData.elements, history, historyIndex]);

    // Add element
    const handleAddElement = useCallback((element) => {
        const newId = element.id || `${element.type}-${Date.now()}`;

        // Calculate position based on element type
        // LUÔN dùng desktop mode làm base để đảm bảo consistency
        let newY = 0;
        let newX = 0;

        if (element.type === 'section') {
            // Sections stack vertically - use calculateNextSectionY
            newY = calculateNextSectionY(pageData.elements);
            newX = 0; // Sections always start at x=0
        } else {
            // Other elements (countdown, carousel, etc.) - place in center
            const canvasWidth = 1200; // Always use desktop width for calculation
            const elementWidth = element.size?.width || 600;
            newX = Math.max(0, (canvasWidth - elementWidth) / 2);

            // Find last element position (from desktop mode)
            const allElements = pageData.elements;
            if (allElements.length > 0) {
                const lastEl = allElements[allElements.length - 1];
                const lastElY = lastEl.position?.desktop?.y || 0;
                const lastElHeight = lastEl.size?.height || 0;
                newY = lastElY + lastElHeight + 40; // Add 40px gap
            } else {
                newY = 40; // Start with 40px from top
            }
        }

        const baseElement = {
            ...element,
            id: newId,
            position: {
                desktop: { x: newX, y: newY, z: element.position?.desktop?.z || 1 },
                tablet: { x: newX, y: newY, z: element.position?.tablet?.z || 1 },
                mobile: { x: newX, y: newY, z: element.position?.mobile?.z || 1 },
            },
            size: element.size || { width: 600, height: 400 },
            mobileSize: element.mobileSize,
            tabletSize: element.tabletSize,
            styles: {
                ...element.styles,
            },
            responsiveStyles: element.responsiveStyles || {},
            componentData: element.componentData || {},
            mobileComponentData: element.mobileComponentData,
            tabletComponentData: element.tabletComponentData,
            children: element.children || [],
            visible: element.visible !== false,
            locked: element.locked || false,
        };

        // Initialize full responsive data if not present
        const newElement = (!baseElement.mobileSize || !baseElement.tabletSize ||
                           !baseElement.responsiveStyles?.mobile || !baseElement.responsiveStyles?.tablet)
            ? syncElementBetweenModes(baseElement, 'desktop')
            : baseElement;

        setPageData((prev) => {
            const newElements = [...prev.elements, newElement];
            const newCanvasHeight = calculateCanvasHeight(newElements);
            const newPageData = {
                ...prev,
                elements: newElements,
                canvas: { ...prev.canvas, height: newCanvasHeight },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
        toast.success(`Đã thêm ${element.type}!`);
    }, [pageData, history, historyIndex]);

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
        const element = pageData.elements.find((el) => el.id === id);
        if (!element) return;

        const confirmMessage = element.type === 'section'
            ? 'Bạn có chắc muốn xóa section này?'
            : 'Bạn có chắc muốn xóa element này?';

        if (!window.confirm(confirmMessage)) return;

        setPageData((prev) => {
            // Use deleteSection utility để reorder sections properly
            const reorderedElements = deleteSection(prev.elements, id);
            const newCanvasHeight = calculateCanvasHeight(reorderedElements);

            const newPageData = {
                ...prev,
                elements: reorderedElements,
                canvas: { ...prev.canvas, height: newCanvasHeight },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });

        setSelectedIds((prev) => prev.filter((selId) => selId !== id));
        setSelectedChildId(null);

        // Update guideline to next section position
        const nextY = calculateNextSectionY(pageData.elements.filter(el => el.id !== id));
        setGuideLine({ show: true, y: nextY });

        toast.success(`Đã xóa ${element.type}!`);
    }, [historyIndex, pageData.elements]);

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
            // Use moveSectionUp utility để reorder sections properly
            const reorderedElements = moveSectionUp(prev.elements, id);

            // Check if actually moved
            if (reorderedElements === prev.elements) {
                toast.info('Section đã ở vị trí đầu tiên');
                return prev;
            }

            const newCanvasHeight = calculateCanvasHeight(reorderedElements);
            const newPageData = {
                ...prev,
                elements: reorderedElements,
                canvas: { ...prev.canvas, height: newCanvasHeight },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });

        // Update guideline
        const nextY = calculateNextSectionY(pageData.elements);
        setGuideLine({ show: true, y: nextY });

        toast.success('Đã di chuyển section lên!');
    }, [historyIndex, pageData.elements]);

    // Move element down
    const handleMoveElementDown = useCallback((id, e) => {
        if (e) e.stopPropagation();
        setPageData((prev) => {
            // Use moveSectionDown utility để reorder sections properly
            const reorderedElements = moveSectionDown(prev.elements, id);

            // Check if actually moved
            if (reorderedElements === prev.elements) {
                toast.info('Section đã ở vị trí cuối cùng');
                return prev;
            }

            const newCanvasHeight = calculateCanvasHeight(reorderedElements);
            const newPageData = {
                ...prev,
                elements: reorderedElements,
                canvas: { ...prev.canvas, height: newCanvasHeight },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });

        // Update guideline
        const nextY = calculateNextSectionY(pageData.elements);
        setGuideLine({ show: true, y: nextY });

        toast.success('Đã di chuyển section xuống!');
    }, [historyIndex, pageData.elements]);

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

    // Copy element to clipboard
    const handleCopyElement = useCallback(() => {
        if (selectedIds.length === 0) {
            toast.warning('Chọn một element để copy');
            return;
        }
        const element = pageData.elements.find((el) => el.id === selectedIds[0]);
        if (element) {
            setClipboard({ ...element });
            toast.success(`Đã copy ${element.type}! (Ctrl+V để paste)`);
        }
    }, [selectedIds, pageData.elements]);

    // Cut element to clipboard
    const handleCutElement = useCallback(() => {
        if (selectedIds.length === 0) {
            toast.warning('Chọn một element để cut');
            return;
        }
        const element = pageData.elements.find((el) => el.id === selectedIds[0]);
        if (element) {
            setClipboard({ ...element });
            // Delete the original element
            handleDeleteElement(selectedIds[0], null);
            toast.success(`Đã cut ${element.type}! (Ctrl+V để paste)`);
        }
    }, [selectedIds, pageData.elements, handleDeleteElement]);

    // Paste element from clipboard
    const handlePasteElement = useCallback(() => {
        if (!clipboard) {
            toast.warning('Clipboard trống! Copy một element trước (Ctrl+C)');
            return;
        }

        const newElement = {
            ...clipboard,
            id: `${clipboard.type}-${Date.now()}`,
            position: {
                // Paste với offset +20px để thấy rõ element mới
                desktop: {
                    x: (clipboard.position?.desktop?.x || 0) + 20,
                    y: (clipboard.position?.desktop?.y || 0) + 20,
                    z: clipboard.position?.desktop?.z || 1
                },
                tablet: {
                    x: (clipboard.position?.tablet?.x || 0) + 20,
                    y: (clipboard.position?.tablet?.y || 0) + 20,
                    z: clipboard.position?.tablet?.z || 1
                },
                mobile: {
                    x: (clipboard.position?.mobile?.x || 0) + 20,
                    y: (clipboard.position?.mobile?.y || 0) + 20,
                    z: clipboard.position?.mobile?.z || 1
                },
            },
        };

        setPageData((prev) => {
            const newElements = [...prev.elements, newElement];
            const newPageData = {
                ...prev,
                elements: newElements,
                canvas: { ...prev.canvas, height: calculateCanvasHeight(newElements) },
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });

        // Select the newly pasted element
        setSelectedIds([newElement.id]);
        toast.success(`Đã paste ${clipboard.type}!`);
    }, [clipboard, history, historyIndex]);

    // Duplicate element (Ctrl+D)
    const handleDuplicateElement = useCallback((id, e) => {
        if (e) e.stopPropagation();

        // If no ID provided, use selected element
        const elementId = id || selectedIds[0];
        if (!elementId) {
            toast.warning('Chọn một element để duplicate');
            return;
        }

        const element = pageData.elements.find((el) => el.id === elementId);
        if (element) {
            const newElement = {
                ...element,
                id: `${element.type}-${Date.now()}`,
                position: {
                    desktop: {
                        x: (element.position?.desktop?.x || 0) + 20,
                        y: (element.position?.desktop?.y || 0) + 20,
                        z: element.position?.desktop?.z || 1
                    },
                    tablet: {
                        x: (element.position?.tablet?.x || 0) + 20,
                        y: (element.position?.tablet?.y || 0) + 20,
                        z: element.position?.tablet?.z || 1
                    },
                    mobile: {
                        x: (element.position?.mobile?.x || 0) + 20,
                        y: (element.position?.mobile?.y || 0) + 20,
                        z: element.position?.mobile?.z || 1
                    },
                },
            };
            setPageData((prev) => {
                const newElements = [...prev.elements, newElement];
                const newPageData = {
                    ...prev,
                    elements: newElements,
                    canvas: { ...prev.canvas, height: calculateCanvasHeight(newElements) },
                    meta: { ...prev.meta, updated_at: new Date().toISOString() }
                };
                setHistory([...history.slice(0, historyIndex + 1), newPageData]);
                setHistoryIndex(historyIndex + 1);
                return newPageData;
            });

            // Select the duplicated element
            setSelectedIds([newElement.id]);
            toast.success(`Đã duplicate ${element.type}!`);
        }
    }, [historyIndex, pageData.elements, selectedIds]);

    // Popup Layer Manager handlers
    const handleTogglePopupVisibility = useCallback((popupId) => {
        setPageData((prev) => {
            const newPageData = {
                ...prev,
                elements: prev.elements.map((el) =>
                    el.id === popupId ? { ...el, visible: !el.visible } : el
                ),
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
    }, [history, historyIndex]);

    const handleReorderPopups = useCallback((reorderedPopups) => {
        setPageData((prev) => {
            const nonPopups = prev.elements.filter((el) => el.type !== 'popup');
            const newPageData = {
                ...prev,
                elements: [...nonPopups, ...reorderedPopups],
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });
    }, [history, historyIndex]);

    const handleAddNewPopup = useCallback(() => {
        const nextZ = pageData.elements.filter((el) => el.type === 'popup').length + 1001;
        const newPopup = {
            id: `POPUP-${Date.now()}`,
            type: 'popup',
            componentData: {
                title: `Popup ${nextZ - 1000}`,
                trigger: 'manual',
                structure: 'ladi-standard',
            },
            position: {
                desktop: { x: 100, y: 100, z: nextZ },
                tablet: { x: 100, y: 100, z: nextZ },
                mobile: { x: 50, y: 50, z: nextZ },
            },
            size: { width: 600, height: 400 },
            mobileSize: { width: 340, height: 400 },
            tabletSize: { width: 600, height: 400 },
            styles: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
                padding: '24px',
            },
            children: [],
            visible: true,
            locked: false,
            isPopup: true,
        };

        setPageData((prev) => {
            const newElements = [...prev.elements, newPopup];
            const newPageData = {
                ...prev,
                elements: newElements,
                meta: { ...prev.meta, updated_at: new Date().toISOString() }
            };
            setHistory([...history.slice(0, historyIndex + 1), newPageData]);
            setHistoryIndex(historyIndex + 1);
            return newPageData;
        });

        setSelectedIds([newPopup.id]);
    }, [pageData.elements, history, historyIndex]);

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

    // Update child size
    const handleUpdateChildSize = useCallback((parentId, childId, newSize, e) => {
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
                                    ? { ...child, size: { ...child.size, [viewMode]: newSize } }
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

    // AI Content Generator
    const handleAIContentGenerator = useCallback(() => {
        // Determine element type from selected element
        const selected = selectedIds.length > 0 && pageData.elements.find(el => el.id === selectedIds[0]);
        const elementType = selected ? selected.type : 'paragraph';
        setAIElementType(elementType);
        setShowAIContentModal(true);
    }, [selectedIds, pageData.elements]);

    // AI Page Analyzer
    const handleAIPageAnalyzer = useCallback(() => {
        setShowAIAnalyzer(true);
    }, []);

    // AI Content Insert Handler
    const handleAIContentInsert = useCallback((content) => {
        if (selectedChildId && selectedIds.length > 0) {
            // Update child element content
            const parentId = selectedIds[0];
            setPageData((prev) => {
                const newPageData = {
                    ...prev,
                    elements: prev.elements.map((el) => {
                        if (el.id === parentId) {
                            return {
                                ...el,
                                children: el.children.map((child) =>
                                    child.id === selectedChildId
                                        ? {
                                            ...child,
                                            componentData: {
                                                ...child.componentData,
                                                text: content,
                                                content: content
                                            }
                                        }
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
            toast.success('Đã chèn nội dung AI!');
        } else if (selectedIds.length > 0) {
            // Update parent element content
            const elementId = selectedIds[0];
            setPageData((prev) => {
                const newPageData = {
                    ...prev,
                    elements: prev.elements.map((el) =>
                        el.id === elementId
                            ? {
                                ...el,
                                componentData: {
                                    ...el.componentData,
                                    text: content,
                                    content: content
                                }
                            }
                            : el
                    ),
                    meta: { ...prev.meta, updated_at: new Date().toISOString() }
                };
                setHistory([...history.slice(0, historyIndex + 1), newPageData]);
                setHistoryIndex(historyIndex + 1);
                return newPageData;
            });
            toast.success('Đã chèn nội dung AI!');
        } else {
            toast.warning('Vui lòng chọn một element trước!');
        }
        setShowAIContentModal(false);
    }, [selectedIds, selectedChildId, historyIndex, history, pageData]);

    // Import .iuhpage file
    const handleImportIUHPage = useCallback((event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.iuhpage')) {
            toast.error('Vui lòng chọn file .iuhpage');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const iuhpageData = JSON.parse(content);

                // Validate format
                if (iuhpageData.format !== 'iuhpage' || !iuhpageData.pageData) {
                    toast.error('File .iuhpage không hợp lệ');
                    return;
                }

                // Extract pageData and embedded images
                const importedPageData = iuhpageData.pageData;
                const embeddedImages = iuhpageData.embeddedImages || {};

                // Convert base64 images back to blob URLs if needed
                // For now, we'll keep the base64 in the page data as it can be used directly
                const processedPageData = JSON.parse(JSON.stringify(importedPageData));

                // Update embedded images from base64 to data URLs
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

                // Update page data
                setPageData(processedPageData);
                setHistory([processedPageData]);
                setHistoryIndex(0);

                toast.success(`Đã import thành công từ ${file.name}!`);
            } catch (error) {
                console.error('Import error:', error);
                toast.error('Lỗi khi import file: ' + error.message);
            }
        };

        reader.onerror = () => {
            toast.error('Lỗi khi đọc file');
        };

        reader.readAsText(file);
        // Reset input value to allow importing the same file again
        event.target.value = '';
    }, [setPageData, setHistory, setHistoryIndex]);

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

    // Keyboard shortcuts - placed after all handlers are defined
    useEffect(() => {
        const handleKeyDown = useKeyboardShortcuts({
            onUndo: handleUndo,
            onRedo: handleRedo,
            onCopy: handleCopyElement,
            onCut: handleCutElement,
            onPaste: handlePasteElement,
            onDuplicate: () => handleDuplicateElement(null, null),
            onDelete: () => {
                if (selectedIds.length > 0) {
                    handleDeleteElement(selectedIds[0], null);
                }
            },
            onDeselect: () => {
                setSelectedIds([]);
                setSelectedChildId(null);
            },
            onSave: handleSave,
            onPreview: () => handlePreview(),
            onToggleGrid: () => setShowGrid(prev => !prev),
        });

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        handleUndo,
        handleRedo,
        handleCopyElement,
        handleCutElement,
        handlePasteElement,
        handleDuplicateElement,
        handleDeleteElement,
        handleSave,
        handlePreview,
        selectedIds,
    ]);

    // Smart Auto-save with debounce (save after 30 seconds of inactivity)
    useEffect(() => {
        if (!pageId || isLoading || isSaving) return;

        // Skip auto-save for first load
        if (pageData.elements.length === 0) return;

        const autoSaveTimer = setTimeout(() => {
            console.log('[AutoSave] Triggering auto-save...');
            handleAutoSave();
        }, 30000); // 30 seconds

        return () => {
            clearTimeout(autoSaveTimer);
        };
    }, [pageData, pageId, isLoading, isSaving, handleAutoSave]);

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
        if (type === 'iframe') {
            return (
                <IframePropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={handleEditElement}
                    isCollapsed={isPropertiesCollapsed}
                    onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                    className="w-80 bg-white shadow-lg p-4"
                />
            );
        }
        // Advanced Components
        if (['countdown', 'carousel', 'accordion', 'tabs', 'progress', 'rating', 'social-proof', 'social-proof-stats'].includes(type)) {
            return (
                <AdvancedPropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={handleEditElement}
                    isCollapsed={isPropertiesCollapsed}
                    onToggle={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
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
                            onImport={handleImportIUHPage}
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
                            onAIContentGenerator={handleAIContentGenerator}
                            onAIPageAnalyzer={handleAIPageAnalyzer}
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
                            onUpdateChildSize={handleUpdateChildSize}
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

                    {/* AI Content Generator Modal */}
                    {showAIContentModal && (
                        <AIContentModal
                            isOpen={showAIContentModal}
                            onClose={() => setShowAIContentModal(false)}
                            onInsert={handleAIContentInsert}
                            elementType={aiElementType}
                        />
                    )}

                    {/* AI Page Analyzer Modal */}
                    {showAIAnalyzer && (
                        <AIPageAnalyzer
                            isOpen={showAIAnalyzer}
                            onClose={() => setShowAIAnalyzer(false)}
                            pageData={pageData}
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
                <PopupLayerManager
                    popups={pageData.elements.filter((el) => el.type === 'popup')}
                    selectedPopupId={selectedIds.find((id) => {
                        const el = pageData.elements.find((e) => e.id === id);
                        return el && el.type === 'popup';
                    })}
                    onSelectPopup={(popupId) => handleSelectElement([popupId])}
                    onTogglePopupVisibility={handleTogglePopupVisibility}
                    onDeletePopup={handleDeleteElement}
                    onReorderPopups={handleReorderPopups}
                    onAddPopup={handleAddNewPopup}
                    isCollapsed={isPopupLayerCollapsed}
                    onToggleCollapse={() => setIsPopupLayerCollapsed(!isPopupLayerCollapsed)}
                />
            </div>
        </DndProvider>
    );
};

export default CreateLanding;