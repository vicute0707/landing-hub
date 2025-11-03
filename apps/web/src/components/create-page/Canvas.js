/**
 * Canvas Component - Landing Page Builder
 *
 * ARCHITECTURE: 3-Layer Drag & Drop System (LadiPage-style)
 *
 * LAYER 1 (UI Layer):
 * - Mouse event tracking (hover, drop)
 * - Visual feedback (drag preview, guidelines)
 * - Performance optimization (rafThrottle for 60fps)
 *
 * LAYER 2 (Logic Layer):
 * - Coordinate transformation: client coordinates → canvas coordinates
 * - Snap-to-grid algorithm: x = round(x / gridSize) * gridSize
 * - Smart guide snapping: snap to element edges/centers
 * - Collision detection (future enhancement)
 *
 * LAYER 3 (Data Layer):
 * - JSON state management for all elements
 * - Immutable updates to element positions
 * - Auto-responsive scaling: desktop → tablet/mobile
 * - State format: {id, type, position: {desktop, tablet, mobile}, size, ...}
 *
 * COORDINATE SYSTEM:
 * - Client coordinates: Browser viewport (clientX, clientY from mouse event)
 * - Canvas coordinates: Actual canvas position accounting for zoom/scroll
 * - Transform: canvasX = (clientX - rect.left) / zoom
 *
 * RESPONSIVE SCALING:
 * - Desktop: 1200px
 * - Tablet: 768px (scale = 768/1200 = 0.64)
 * - Mobile: 375px (scale = 375/1200 = 0.3125)
 * - Formula: newX = oldX * scaleFactor
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import { debounce, throttle } from 'lodash';
import Guidelines from './Guidelines';
import SelectionOverlay from './SelectionOverlay';
import '../../styles/CreateLanding.css';
import { Element } from './Element';
import { ItemTypes, renderComponentContent } from './helpers';
import AddSectionButton from './AddSectionButton';
import eventController from '../../utils/EventUtils';
import { getResponsiveValues } from '../../utils/responsiveSync';
// DRAG DROP CORE: New 3-layer architecture utilities
import {
    transformCoordinates,
    snapToGrid,
    snapToGuides,
    generateSnapPoints,
    autoScale,
    clampToCanvas,
    getElementBounds,
    BREAKPOINTS,
    rafThrottle,
} from '../../utils/dragDropCore';

const Canvas = React.memo(({
                               pageData,
                               selectedIds,
                               onSelectElement,
                               onUpdatePosition,
                               onUpdateSize,
                               onDeleteElement,
                               onAddElement,
                               onGroupElements,
                               viewMode,
                               zoomLevel,
                               gridSize,
                               showGrid,
                               onEditElement,
                               onDuplicateElement,
                               onMoveElementUp,
                               onMoveElementDown,
                               onSelectChild,
                               selectedChildId,
                               onAddChild,
                               onUpdateChildPosition,
                               onUpdateChildSize,
                               onMoveChild,
                               guideLine,
                               onShowAddSectionPopup,
                               onSaveTemplate,
                               onToggleVisibility,
                               onDeleteChild,
                           }) => {
    const canvasRef = useRef(null);
    const [guidelines, setGuidelines] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [dragPreview, setDragPreview] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [guideLinePosition, setGuideLinePosition] = useState(guideLine?.y || 0);
    const [visiblePopups, setVisiblePopups] = useState([]);
    // Helper function to get canvas width based on viewMode
    // Uses BREAKPOINTS from dragDropCore for consistency
    const getCanvasWidth = useCallback((mode) => {
        return BREAKPOINTS[mode] || BREAKPOINTS.desktop;
    }, []);

    const [canvasBounds, setCanvasBounds] = useState({
        width: canvasRef.current ? canvasRef.current.offsetWidth / (zoomLevel / 100) : getCanvasWidth(viewMode),
        height: canvasRef.current ? canvasRef.current.offsetHeight / (zoomLevel / 100) : 1000,
    });
    useEffect(() => {
        // Subscribe to popup events
        const unsubscribeOpen = eventController.subscribe('popup-open', ({ popupId }) => {
            setVisiblePopups(prev => {
                if (!prev.includes(popupId)) {
                    return [...prev, popupId];
                }
                return prev;
            });
        });

        const unsubscribeClose = eventController.subscribe('popup-close', ({ popupId }) => {
            setVisiblePopups(prev => prev.filter(id => id !== popupId));
        });

        // Cleanup
        return () => {
            unsubscribeOpen();
            unsubscribeClose();
        };
    }, []);
    useEffect(() => {
        const handleResize = () => {
            setCanvasBounds({
                width: canvasRef.current ? canvasRef.current.offsetWidth / (zoomLevel / 100) : getCanvasWidth(viewMode),
                height: canvasRef.current ? canvasRef.current.offsetHeight / (zoomLevel / 100) : 1000,
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [viewMode, zoomLevel, getCanvasWidth]);

    // LAYER 2: Generate snap points using dragDropCore
    const getSnapPoints = useCallback(() => {
        // Use dragDropCore's generateSnapPoints for all elements
        const elementSnapPoints = generateSnapPoints(pageData.elements, viewMode);

        // Add canvas boundary snap points
        const canvasWidth = getCanvasWidth(viewMode);
        const canvasPoints = [
            { x: 0, y: null },
            { x: canvasWidth, y: null },
            { x: canvasWidth / 2, y: null },
            { x: null, y: 0 },
            { x: null, y: canvasBounds.height },
            { x: null, y: canvasBounds.height / 2 },
        ];

        return [...elementSnapPoints, ...canvasPoints];
    }, [pageData.elements, canvasBounds, viewMode, getCanvasWidth]);

    const calculateGuidelines = useCallback((snapped) => {
        const newGuidelines = [];
        pageData.elements.forEach((el) => {
            const bounds = getElementBounds(el);
            if (Math.abs(snapped.x - bounds.left) < 15) newGuidelines.push({ vertical: true, position: bounds.left });
            if (Math.abs(snapped.x - bounds.right) < 15) newGuidelines.push({ vertical: true, position: bounds.right });
            if (Math.abs(snapped.x - bounds.centerX) < 15) newGuidelines.push({ vertical: true, position: bounds.centerX });
            if (Math.abs(snapped.y - bounds.top) < 15) newGuidelines.push({ vertical: false, position: bounds.top });
            if (Math.abs(snapped.y - bounds.bottom) < 15) newGuidelines.push({ vertical: false, position: bounds.bottom });
            if (Math.abs(snapped.y - bounds.centerY) < 15) newGuidelines.push({ vertical: false, position: bounds.centerY });
            el.children?.forEach((child) => {
                const childBounds = getElementBounds(child);
                if (Math.abs(snapped.x - childBounds.left) < 15) newGuidelines.push({ vertical: true, position: childBounds.left });
                if (Math.abs(snapped.x - childBounds.right) < 15) newGuidelines.push({ vertical: true, position: childBounds.right });
                if (Math.abs(snapped.x - childBounds.centerX) < 15) newGuidelines.push({ vertical: true, position: childBounds.centerX });
                if (Math.abs(snapped.y - childBounds.top) < 15) newGuidelines.push({ vertical: false, position: childBounds.top });
                if (Math.abs(snapped.y - childBounds.bottom) < 15) newGuidelines.push({ vertical: false, position: childBounds.bottom });
                if (Math.abs(snapped.y - childBounds.centerY) < 15) newGuidelines.push({ vertical: false, position: childBounds.centerY });
            });
        });
        const canvasWidth = getCanvasWidth(viewMode);
        if (Math.abs(snapped.x) < 15) newGuidelines.push({ vertical: true, position: 0 });
        if (Math.abs(snapped.x - canvasWidth) < 15)
            newGuidelines.push({ vertical: true, position: canvasWidth });
        if (Math.abs(snapped.x - canvasWidth / 2) < 15)
            newGuidelines.push({ vertical: true, position: canvasWidth / 2 });
        if (Math.abs(snapped.y) < 15) newGuidelines.push({ vertical: false, position: 0 });
        if (Math.abs(snapped.y - canvasBounds.height) < 15) newGuidelines.push({ vertical: false, position: canvasBounds.height });
        if (Math.abs(snapped.y - canvasBounds.height / 2) < 15)
            newGuidelines.push({ vertical: false, position: canvasBounds.height / 2 });
        return newGuidelines;
    }, [pageData.elements, viewMode, canvasBounds, getCanvasWidth]);

    const handleSelectElement = useCallback((ids, ctrlKey) => {
        if (typeof onSelectElement === 'function') {
            onSelectElement(ids, ctrlKey);
            const selectedElements = pageData.elements.filter((el) => ids.includes(el.id));
            const popupIds = selectedElements
                .filter((el) => el.type === 'popup' || el.type === 'modal')
                .map((el) => el.id);
            setVisiblePopups(popupIds);
        } else {
            console.error('onSelectElement is not a function');
        }
    }, [onSelectElement, pageData.elements]);

    const updateCanvasHeight = useCallback(() => {
        const lastSection = pageData.elements
            .filter((el) => el.type === 'section')
            .reduce((maxY, el) => {
                const y = el.position?.[viewMode]?.y || 0;
                const height = el.size?.height || 400;
                return Math.max(maxY, y + height);
            }, 0);
        const newHeight = lastSection + 50;
        setGuideLinePosition(lastSection + 10);
        return newHeight;
    }, [pageData.elements, viewMode]);

    useEffect(() => {
        updateCanvasHeight();
    }, [updateCanvasHeight]);

    useEffect(() => {
        const unsubscribeOpen = eventController.subscribe('popup-open', (payload) => {
            const popupElement = pageData.elements.find((el) => el.id === payload.popupId);
            if (!popupElement) {
                toast.error(`Popup "${payload.popupId}" not found!`);
                return;
            }
            setVisiblePopups((prev) => [...new Set([...prev, payload.popupId])]);
            onSelectElement([payload.popupId]);
        });

        const unsubscribeClose = eventController.subscribe('popup-close', (payload) => {
            setVisiblePopups((prev) => prev.filter((popupId) => payload.popupId !== popupId));
            if (selectedIds.includes(payload.popupId)) {
                handleSelectElement([]);
            }
        });

        return () => {
            unsubscribeOpen();
            unsubscribeClose();
        };
    }, [pageData.elements, onSelectElement, selectedIds, handleSelectElement]);

    // LAYER 1: UI Layer - Throttle hover updates for 60fps performance
    const throttledHover = useMemo(
        () =>
            rafThrottle((item, monitor, clientOffset) => {
                if (!clientOffset || !canvasRef.current) {
                    setDragPreview(null);
                    return;
                }

                // LAYER 2: Transform client coordinates to canvas coordinates
                const containerRect = canvasRef.current.getBoundingClientRect();
                const canvasPos = transformCoordinates(
                    clientOffset.x,
                    clientOffset.y,
                    containerRect,
                    zoomLevel
                );

                // LAYER 2: Apply snap-to-grid and snap-to-guides
                let snapped;
                if (showGrid && gridSize > 1) {
                    // Grid snapping enabled
                    snapped = snapToGrid(canvasPos.x, canvasPos.y, gridSize, true);
                } else {
                    // Smart guide snapping only
                    const snapPoints = getSnapPoints();
                    const guideSnap = snapToGuides(canvasPos.x, canvasPos.y, snapPoints, 10);
                    snapped = { x: guideSnap.x, y: guideSnap.y };
                }

                if (monitor.getItemType() === ItemTypes.ELEMENT && item.json) {
                    const defaultWidth = item.json.type === 'section' ? getCanvasWidth(viewMode) : 600;
                    setDragPreview({
                        id: 'preview',
                        x: snapped.x,
                        y: snapped.y,
                        size: item.json.size || { width: defaultWidth, height: 400 },
                        type: item.json.type,
                        componentData: item.json.componentData || { structure: 'ladi-standard' },
                        styles: item.json.styles || {},
                        children: item.json.children || [],
                    });
                } else if (monitor.getItemType() === ItemTypes.CHILD_ELEMENT) {
                    const sourceElement = pageData.elements.find((el) => el.id === item.parentId);
                    const child = sourceElement?.children.find((c) => c.id === item.childId);
                    if (child) {
                        setDragPreview({
                            id: item.childId,
                            x: snapped.x,
                            y: snapped.y,
                            size: item.size || { width: 200, height: 50 },
                            type: child.type,
                            componentData: child.componentData || {},
                            styles: child.styles || {},
                            children: [],
                        });
                    }
                }
                const newGuidelines = calculateGuidelines(snapped);
                setGuidelines(newGuidelines);
            }, 16), // ~60fps
        [zoomLevel, viewMode, showGrid, gridSize, pageData.elements, getCanvasWidth, getSnapPoints, calculateGuidelines]
    );

    const [{ isOver, dragItem }, drop] = useDrop(() => ({
        accept: [ItemTypes.ELEMENT, ItemTypes.CHILD_ELEMENT],
        hover: (item, monitor) => {
            const clientOffset = monitor.getClientOffset();
            throttledHover(item, monitor, clientOffset);
        },
        drop: (item, monitor) => {
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset || !canvasRef.current) {
                toast.error('Không thể xác định vị trí thả!');
                setDragPreview(null);
                setGuidelines([]);
                return { moved: false };
            }

            // LAYER 2: Transform coordinates using dragDropCore
            const containerRect = canvasRef.current.getBoundingClientRect();
            const canvasPos = transformCoordinates(
                clientOffset.x,
                clientOffset.y,
                containerRect,
                zoomLevel
            );

            // LAYER 2: Apply snapping
            let snapped;
            if (showGrid && gridSize > 1) {
                snapped = snapToGrid(canvasPos.x, canvasPos.y, gridSize, true);
            } else {
                const snapPoints = getSnapPoints();
                const guideSnap = snapToGuides(canvasPos.x, canvasPos.y, snapPoints, 10);
                snapped = { x: guideSnap.x, y: guideSnap.y };
            }
            if (monitor.getItemType() === ItemTypes.CHILD_ELEMENT) {
                // IMPROVED: Check if dropping on a section/popup
                // If yes, let the section handle it (don't intercept)
                // Only convert to top-level if dropping on empty canvas

                const didDrop = monitor.didDrop();
                if (didDrop) {
                    // Section or popup already handled the drop
                    setDragPreview(null);
                    setGuidelines([]);
                    return { moved: false };
                }

                // Dropping on EMPTY canvas → convert to top-level element
                const sourceSection = pageData.elements.find((el) => el.id === item.parentId);
                if (!sourceSection) {
                    toast.error('Không tìm thấy section nguồn!');
                    setDragPreview(null);
                    setGuidelines([]);
                    return { moved: false };
                }

                // Find the child being dragged
                const childElement = sourceSection.children?.find((c) => c.id === item.childId);
                if (!childElement) {
                    toast.error('Không tìm thấy element con!');
                    setDragPreview(null);
                    setGuidelines([]);
                    return { moved: false };
                }

                // Convert to top-level element for free positioning
                const newElement = {
                    ...childElement,
                    position: {
                        desktop: { x: snapped.x, y: snapped.y, z: 10 },
                        tablet: { x: snapped.x, y: snapped.y, z: 10 },
                        mobile: { x: snapped.x, y: snapped.y, z: 10 },
                    },
                };

                // Remove from parent and add as top-level
                onMoveChild(item.parentId, item.childId, null, snapped);

                setDragPreview(null);
                setGuidelines([]);
                toast.success('Element được di chuyển ra ngoài section!');
                return { moved: true, newPosition: snapped };
            } else if (monitor.getItemType() === ItemTypes.ELEMENT) {
                if (item.json.type !== 'section' && item.json.type !== 'popup' && item.json.type !== 'modal') {
                    setDragPreview(null);
                    setGuidelines([]);
                    return { moved: false };
                }

                // FIXED: Calculate position for current viewMode, but always use desktop for section stacking
                const lastSectionY = pageData.elements
                    .filter((el) => el.type === 'section')
                    .reduce((maxY, el) => {
                        const y = el.position?.desktop?.y || 0;
                        const height = el.size?.height || 400;
                        return Math.max(maxY, y + height);
                    }, 0);

                // For sections, use lastSectionY for all viewModes (sections stack vertically)
                // For popups/modals, use snapped position adjusted per viewMode
                const getResponsivePosition = (mode) => {
                    if (item.json.type === 'section') {
                        return { x: 0, y: lastSectionY, z: 1 };
                    }
                    // For popups/modals, center them or use drop position
                    const canvasWidth = getCanvasWidth(mode);
                    return {
                        x: Math.max(0, Math.min(snapped.x, canvasWidth - (item.json.size?.width || 600))),
                        y: Math.max(0, snapped.y),
                        z: 1001
                    };
                };

                let newElement = {
                    id: `${item.json.type}-${Date.now()}`,
                    type: item.json.type,
                    componentData: JSON.parse(JSON.stringify(item.json.componentData || { structure: item.json.type === 'section' ? 'ladi-standard' : undefined })),
                    position: {
                        desktop: getResponsivePosition('desktop'),
                        tablet: getResponsivePosition('tablet'),
                        mobile: getResponsivePosition('mobile'),
                    },
                    size: {
                        ...item.json.size,
                        width: item.json.type === 'section' ? 1200 : (item.json.size?.width || 600),
                        height: item.json.size?.height || (item.json.type === 'section' ? 400 : 400),
                    },
                    mobileSize: item.json.mobileSize,
                    tabletSize: item.json.tabletSize,
                    styles: JSON.parse(JSON.stringify(item.json.styles || {})),
                    children: JSON.parse(JSON.stringify(item.json.children || [])),
                    visible: true,
                    locked: false,
                    meta: { updated_at: new Date().toISOString() },
                };

                // LAYER 3: Apply auto-responsive scaling using dragDropCore
                if (item.json.type !== 'section') {
                    // Auto-scale to all viewports (desktop, tablet, mobile)
                    newElement = autoScale(newElement);
                } else {
                    // For sections, use default responsive sizes
                    newElement.mobileSize = item.json.mobileSize || { width: BREAKPOINTS.mobile, height: item.json.size?.height || 400 };
                    newElement.tabletSize = item.json.tabletSize || { width: BREAKPOINTS.tablet, height: item.json.size?.height || 400 };
                }

                onAddElement(newElement);
                if (item.json.type === 'section') {
                    setGuideLinePosition(lastSectionY + (item.json.size?.height || 400));
                    updateCanvasHeight();
                }
                setDragPreview(null);
                setGuidelines([]);
                return {
                    moved: true,
                    newPosition: {
                        x: item.json.type === 'section' ? 0 : snapped.x,
                        y: item.json.type === 'section' ? lastSectionY : snapped.y,
                    },
                };
            }
            setDragPreview(null);
            setGuidelines([]);
            return { moved: false };
        },
        collect: (monitor) => ({ isOver: monitor.isOver(), dragItem: monitor.getItem() }),
    }), [pageData.elements, viewMode, zoomLevel, gridSize, showGrid, canvasBounds, onAddElement, onMoveChild, updateCanvasHeight]);

    const handleContextMenu = useCallback((id, position) => {
        setContextMenu({ id, position });
    }, []);

    const handleCanvasClick = useCallback((e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (e.target === canvasRef.current) {
            handleSelectElement([]);
            onSelectChild(null, null);
            setContextMenu(null);
            setDragPreview(null);
            if (!selectedIds.some(id => pageData.elements.find(el => el.id === id)?.type === 'popup')) {
                setVisiblePopups([]);
            }
        }
    }, [handleSelectElement, onSelectChild, selectedIds, pageData.elements]);

    const handleKeyDown = useCallback((e) => {
        const ids = Array.isArray(selectedIds) ? selectedIds : [];
        if (!ids.length) return;
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const step = e.shiftKey ? 10 : 1;
        ids.forEach((id) => {
            const element = pageData.elements.find((el) => el.id === id);
            if (element && element.type !== 'section' && element.type !== 'popup' && element.type !== 'modal') {
                const { position: currentPos } = getResponsiveValues(element, viewMode);
                const newY = e.key === 'ArrowUp' ? Math.max(0, (currentPos.y || 0) - step) : (currentPos.y || 0) + step;
                const newX = e.key === 'ArrowLeft' ? Math.max(0, (currentPos.x || 0) - step) : (currentPos.x || 0) + step;
                switch (e.key) {
                    case 'ArrowUp':
                    case 'ArrowDown':
                        onUpdatePosition(id, { [viewMode]: { x: currentPos.x || 0, y: newY, z: currentPos.z || 1 } }, 'absolute');
                        break;
                    case 'ArrowLeft':
                    case 'ArrowRight':
                        onUpdatePosition(id, { [viewMode]: { x: newX, y: currentPos.y || 0, z: currentPos.z || 1 } }, 'absolute');
                        break;
                    case 'Delete':
                    case 'Backspace':
                        onDeleteElement(id);
                        setVisiblePopups((prev) => prev.filter((popupId) => popupId !== id));
                        break;
                    case 'Escape':
                        handleSelectElement([]);
                        onSelectChild(null, null);
                        setContextMenu(null);
                        setDragPreview(null);
                        setVisiblePopups([]);
                        break;
                    default:
                        break;
                }
            }
        });
    }, [selectedIds, onUpdatePosition, onDeleteElement, handleSelectElement, onSelectChild, viewMode, pageData.elements]);

    useHotkeys('ctrl+a', (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        handleSelectElement(pageData.elements.map((el) => el.id));
    }, [pageData.elements, handleSelectElement]);

    useHotkeys('ctrl+g', (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        const ids = Array.isArray(selectedIds) ? selectedIds : [];
        if (ids.length > 1) {
            onGroupElements(ids);
        }
    }, [selectedIds, onGroupElements]);

    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(null);
            setDragPreview(null);
            setVisiblePopups([]);
        };
        if (contextMenu || visiblePopups.length > 0) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [contextMenu, visiblePopups]);

    const handleClosePopup = useCallback((id) => {
        setVisiblePopups((prev) => prev.filter((popupId) => popupId !== id));
        handleSelectElement([]);
    }, [handleSelectElement]);

    const renderDragPreview = () => {
        if (!dragPreview) return null;
        const { x, y, size, type, componentData, styles, children } = dragPreview;
        const previewStyle = {
            position: 'absolute',
            transform: `translate(${x}px, ${y}px)`,
            width: size.width,
            height: size.height,
            border: '2px dashed #3b82f6',
            background: 'rgba(59, 130, 246, 0.1)',
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.5,
            ...styles,
        };
        return (
            <div className="lpb-drag-preview" style={previewStyle}>
                {renderComponentContent(type, componentData || {}, styles || {}, children || [])}
            </div>
        );
    };

    const renderAddSectionButton = () => {
        if (pageData.elements.length > 0) return null;
        return (
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                }}
            >
                <button
                    onClick={(e) => {
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        setShowPopup(true);
                        if (typeof onShowAddSectionPopup === 'function') {
                            onShowAddSectionPopup();
                        }
                    }}
                    style={{
                        padding: '12px 24px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                    }}
                >
                    Thêm Section
                </button>
            </div>
        );
    };

    const renderContextMenu = () => {
        if (!contextMenu) return null;
        return (
            <div
                className="lpb-context-menu"
                style={{
                    position: 'fixed',
                    left: contextMenu.position.x,
                    top: contextMenu.position.y,
                    zIndex: 10000,
                    background: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    minWidth: '120px',
                }}
            >
                <div
                    className="lpb-context-menu-item"
                    style={{ padding: '8px 12px', cursor: 'pointer' }}
                    onClick={() => {
                        onDeleteElement(contextMenu.id);
                        setContextMenu(null);
                        setVisiblePopups((prev) => prev.filter((id) => id !== contextMenu.id));
                    }}
                >
                    Xóa
                </div>
                <div
                    className="lpb-context-menu-item"
                    style={{ padding: '8px 12px', cursor: 'pointer' }}
                    onClick={() => {
                        onGroupElements([contextMenu.id]);
                        setContextMenu(null);
                    }}
                >
                    Nhóm
                </div>
                <div
                    className="lpb-context-menu-item"
                    style={{ padding: '8px 12px', cursor: 'pointer' }}
                    onClick={() => {
                        onToggleVisibility(contextMenu.id);
                        setContextMenu(null);
                    }}
                >
                    Ẩn/Hiện
                </div>
            </div>
        );
    };

    useEffect(() => {
        if (typeof onDeleteChild !== 'function') {
            console.error('onDeleteChild is not a function in Canvas', onDeleteChild);
        }
    }, [onDeleteChild]);

    return (
        <div className="lpb-canvas-wrapper" onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: 'none' }}>
            <div
                ref={(node) => {
                    canvasRef.current = node;
                    drop(node);
                }}
                className={`lpb-canvas ${
                    viewMode === 'mobile' ? 'lpb-canvas-mobile' : viewMode === 'tablet' ? 'lpb-canvas-tablet' : ''
                }`}
                onClick={handleCanvasClick}
                style={{
                    // FIXED: Set explicit width based on viewMode for proper responsive layout
                    width: `${getCanvasWidth(viewMode)}px`,
                    minHeight: pageData.canvas.height ? `${pageData.canvas.height}px` : '800px',
                    height: 'auto',
                    background: pageData.canvas.background || '#ffffff',
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                    margin: '0 auto',
                    position: 'relative',
                    boxSizing: 'border-box',
                    overflow: 'visible',
                }}
            >
                <Guidelines guidelines={guidelines} zoomLevel={zoomLevel} />
                {pageData.elements.map((element) => (
                    <Element
                        key={element.id}
                        element={element}
                        isSelected={selectedIds.includes(element.id)}
                        onSelectElement={handleSelectElement}
                        onUpdatePosition={onUpdatePosition}
                        viewMode={viewMode}
                        zoomLevel={zoomLevel}
                        gridSize={gridSize}
                        onContextMenu={handleContextMenu}
                        canvasBounds={canvasBounds}
                        canvasRef={canvasRef}
                        onSelectChild={onSelectChild}
                        selectedChildId={selectedChildId}
                        onAddChild={onAddChild}
                        onUpdateChildPosition={onUpdateChildPosition}
                        onUpdateChildSize={onUpdateChildSize}
                        onMoveChild={onMoveChild}
                        showGrid={showGrid}
                        setDragPreview={setDragPreview}
                        visiblePopups={visiblePopups}
                        onClosePopup={handleClosePopup}
                        onSaveTemplate={onSaveTemplate}
                        onToggleVisibility={onToggleVisibility}
                        onEditElement={onEditElement}
                        onDuplicateElement={onDuplicateElement}
                        onMoveElementUp={onMoveElementUp}
                        onMoveElementDown={onMoveElementDown}
                        onDeleteElement={onDeleteElement}
                        onDeleteChild={onDeleteChild}
                    />
                ))}
                {renderDragPreview()}
                {guideLine?.show && (
                    <>
                        <div
                            style={{
                                position: 'absolute',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                top: guideLinePosition,
                                width: `${getCanvasWidth(viewMode)}px`,
                                height: '1px',
                                backgroundColor: '#2563eb',
                                opacity: 0.5,
                                zIndex: 1001,
                            }}
                        />
                        {pageData.elements.length > 0 && (
                            <AddSectionButton guideLinePosition={guideLinePosition} setShowPopup={setShowPopup} onShowAddSectionPopup={onShowAddSectionPopup} />
                        )}
                        <div
                            style={{
                                position: 'absolute',
                                left: `calc(50% - ${getCanvasWidth(viewMode) / 2}px)`,
                                top: 0,
                                width: '1px',
                                height: pageData.canvas.height ? `${pageData.canvas.height}px` : '100%',
                                backgroundColor: '#2563eb',
                                opacity: 0.5,
                                zIndex: 1001,
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: `calc(50% + ${getCanvasWidth(viewMode) / 2}px)`,
                                top: 0,
                                width: '1px',
                                height: pageData.canvas.height ? `${pageData.canvas.height}px` : '100%',
                                backgroundColor: '#2563eb',
                                opacity: 0.5,
                                zIndex: 1001,
                            }}
                        />
                    </>
                )}
                <SelectionOverlay
                    selectedElements={pageData.elements.filter((el) => Array.isArray(selectedIds) && selectedIds.includes(el.id))}
                    onResize={onUpdateSize}
                    zoomLevel={zoomLevel}
                />
                {renderContextMenu()}
                {renderAddSectionButton()}
            </div>
        </div>
    );
});

Canvas.propTypes = {
    pageData: PropTypes.shape({
        canvas: PropTypes.shape({
            width: PropTypes.number,
            height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            background: PropTypes.string,
        }).isRequired,
        elements: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string.isRequired,
            type: PropTypes.string.isRequired,
            position: PropTypes.object,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number,
            }),
            styles: PropTypes.object,
            children: PropTypes.array,
            visible: PropTypes.bool,
            locked: PropTypes.bool,
            meta: PropTypes.shape({
                created_at: PropTypes.string,
                updated_at: PropTypes.string,
            }),
        })).isRequired,
        meta: PropTypes.shape({
            created_at: PropTypes.string,
            updated_at: PropTypes.string,
        }),
    }).isRequired,
    selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    onSelectElement: PropTypes.func.isRequired,
    onUpdatePosition: PropTypes.func.isRequired,
    onUpdateSize: PropTypes.func.isRequired,
    onDeleteElement: PropTypes.func.isRequired,
    onAddElement: PropTypes.func.isRequired,
    onGroupElements: PropTypes.func.isRequired,
    viewMode: PropTypes.oneOf(['desktop', 'tablet', 'mobile']).isRequired,
    zoomLevel: PropTypes.number.isRequired,
    gridSize: PropTypes.number.isRequired,
    showGrid: PropTypes.bool.isRequired,
    onEditElement: PropTypes.func.isRequired,
    onDuplicateElement: PropTypes.func.isRequired,
    onMoveElementUp: PropTypes.func.isRequired,
    onMoveElementDown: PropTypes.func.isRequired,
    onSelectChild: PropTypes.func.isRequired,
    selectedChildId: PropTypes.string,
    onAddChild: PropTypes.func.isRequired,
    onUpdateChildPosition: PropTypes.func.isRequired,
    onUpdateChildSize: PropTypes.func.isRequired,
    onMoveChild: PropTypes.func.isRequired,
    guideLine: PropTypes.shape({
        show: PropTypes.bool,
        y: PropTypes.number,
    }),
    onShowAddSectionPopup: PropTypes.func.isRequired,
    onSaveTemplate: PropTypes.func.isRequired,
    onToggleVisibility: PropTypes.func.isRequired,
    onDeleteChild: PropTypes.func.isRequired,
};

export default Canvas;