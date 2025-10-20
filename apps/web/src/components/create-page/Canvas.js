import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useDrop } from 'react-dnd';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import Guidelines from './Guidelines';
import SelectionOverlay from './SelectionOverlay';
import '../../styles/CreateLanding.css';
import { Element } from './Element';
import { ItemTypes, getCanvasPosition, snapToGrid, getElementBounds, renderComponentContent } from './helpers';
import AddSectionButton from './AddSectionButton';
import eventController from '../../utils/EventUtils';
import { getResponsiveValues } from '../../utils/responsiveSync';

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
    const [canvasBounds, setCanvasBounds] = useState({
        width: canvasRef.current ? canvasRef.current.offsetWidth / (zoomLevel / 100) : (viewMode === 'mobile' ? 375 : 1200),
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
                width: canvasRef.current ? canvasRef.current.offsetWidth / (zoomLevel / 100) : (viewMode === 'mobile' ? 375 : 1200),
                height: canvasRef.current ? canvasRef.current.offsetHeight / (zoomLevel / 100) : 1000,
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [viewMode, zoomLevel]);

    const getSnapPoints = useCallback(() => {
        const points = [
            { x: 0, y: 0 },
            { x: viewMode === 'mobile' ? 375 : 1200, y: canvasBounds.height },
            { x: (viewMode === 'mobile' ? 375 : 1200) / 2, y: canvasBounds.height / 2 },
        ];
        pageData.elements.forEach((el) => {
            const bounds = getElementBounds(el);
            points.push(
                { x: bounds.left, y: bounds.top },
                { x: bounds.right, y: bounds.bottom },
                { x: bounds.centerX, y: bounds.centerY },
                { x: bounds.left, y: bounds.centerY },
                { x: bounds.right, y: bounds.centerY },
                { x: bounds.centerX, y: bounds.top },
                { x: bounds.centerX, y: bounds.bottom }
            );
            el.children?.forEach((child) => {
                const childBounds = getElementBounds(child);
                points.push(
                    { x: childBounds.left, y: childBounds.top },
                    { x: childBounds.right, y: childBounds.bottom },
                    { x: childBounds.centerX, y: childBounds.centerY },
                    { x: childBounds.left, y: childBounds.centerY },
                    { x: childBounds.right, y: childBounds.centerY },
                    { x: childBounds.centerX, y: childBounds.top },
                    { x: childBounds.centerX, y: childBounds.bottom }
                );
            });
        });
        return points;
    }, [pageData.elements, canvasBounds, viewMode]);

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
        if (Math.abs(snapped.x) < 15) newGuidelines.push({ vertical: true, position: 0 });
        if (Math.abs(snapped.x - (viewMode === 'mobile' ? 375 : 1200)) < 15)
            newGuidelines.push({ vertical: true, position: viewMode === 'mobile' ? 375 : 1200 });
        if (Math.abs(snapped.x - (viewMode === 'mobile' ? 375 : 1200) / 2) < 15)
            newGuidelines.push({ vertical: true, position: (viewMode === 'mobile' ? 375 : 1200) / 2 });
        if (Math.abs(snapped.y) < 15) newGuidelines.push({ vertical: false, position: 0 });
        if (Math.abs(snapped.y - canvasBounds.height) < 15) newGuidelines.push({ vertical: false, position: canvasBounds.height });
        if (Math.abs(snapped.y - canvasBounds.height / 2) < 15)
            newGuidelines.push({ vertical: false, position: canvasBounds.height / 2 });
        return newGuidelines;
    }, [pageData.elements, viewMode, canvasBounds]);

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

    const [{ isOver, dragItem }, drop] = useDrop(() => ({
        accept: [ItemTypes.ELEMENT, ItemTypes.CHILD_ELEMENT],
        hover: (item, monitor) => {
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset || !canvasRef.current) {
                setDragPreview(null);
                return;
            }
            const pos = getCanvasPosition(clientOffset.x, clientOffset.y, canvasRef.current, zoomLevel);
            const snapPoints = getSnapPoints();
            const snapped = snapToGrid(pos.x, pos.y, showGrid ? gridSize : Infinity, snapPoints);
            if (monitor.getItemType() === ItemTypes.ELEMENT && item.json) {
                setDragPreview({
                    id: 'preview',
                    x: snapped.x,
                    y: snapped.y,
                    size: item.json.size || { width: viewMode === 'mobile' ? 375 : 1200, height: 400 },
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
        },
        drop: (item, monitor) => {
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset || !canvasRef.current) {
                toast.error('Không thể xác định vị trí thả!');
                setDragPreview(null);
                setGuidelines([]);
                return { moved: false };
            }
            const pos = getCanvasPosition(clientOffset.x, clientOffset.y, canvasRef.current, zoomLevel);
            const snapPoints = getSnapPoints();
            const snapped = snapToGrid(pos.x, pos.y, showGrid ? gridSize : Infinity, snapPoints);
            if (monitor.getItemType() === ItemTypes.CHILD_ELEMENT) {
                const sourceSection = pageData.elements.find((el) => el.id === item.parentId);
                if (!sourceSection) {
                    toast.error('Không tìm thấy section nguồn!');
                    setDragPreview(null);
                    setGuidelines([]);
                    return { moved: false };
                }
                onMoveChild(item.parentId, item.childId, null, snapped);
                toast.success('Đã di chuyển thành phần con ra canvas!');
                setDragPreview(null);
                setGuidelines([]);
                return { moved: true, newPosition: snapped };
            } else if (monitor.getItemType() === ItemTypes.ELEMENT) {
                if (item.json.type !== 'section' && item.json.type !== 'popup' && item.json.type !== 'modal') {
                    toast.error('Chỉ có thể thả section, popup hoặc modal lên canvas!');
                    setDragPreview(null);
                    setGuidelines([]);
                    return { moved: false };
                }
                const lastSectionY = pageData.elements
                    .filter((el) => el.type === 'section')
                    .reduce((maxY, el) => {
                        const y = el.position?.[viewMode]?.y || 0;
                        const height = el.size?.height || 400;
                        return Math.max(maxY, y + height);
                    }, 0);
                const newElement = {
                    id: `${item.json.type}-${Date.now()}`,
                    type: item.json.type,
                    componentData: JSON.parse(JSON.stringify(item.json.componentData || { structure: item.json.type === 'section' ? 'ladi-standard' : undefined })),
                    position: {
                        [viewMode]: {
                            x: item.json.type === 'section' ? 0 : snapped.x,
                            y: item.json.type === 'section' ? lastSectionY + 10 : snapped.y,
                        },
                        desktop: {
                            x: item.json.type === 'section' ? 0 : snapped.x,
                            y: item.json.type === 'section' ? lastSectionY + 10 : snapped.y,
                        },
                        tablet: {
                            x: item.json.type === 'section' ? 0 : snapped.x,
                            y: item.json.type === 'section' ? lastSectionY + 10 : snapped.y,
                        },
                        mobile: {
                            x: item.json.type === 'section' ? 0 : snapped.x,
                            y: item.json.type === 'section' ? lastSectionY + 10 : snapped.y,
                        },
                    },
                    size: {
                        ...item.json.size,
                        width: viewMode === 'mobile' ? 375 : item.json.type === 'section' ? 1200 : 600,
                    },
                    styles: JSON.parse(JSON.stringify(item.json.styles || {})),
                    children: JSON.parse(JSON.stringify(item.json.children || [])),
                    visible: true,
                    locked: false,
                    meta: { updated_at: new Date().toISOString() },
                };
                onAddElement(newElement);
                if (item.json.type === 'section') {
                    setGuideLinePosition(lastSectionY + 10 + (item.json.size?.height || 400));
                    updateCanvasHeight();
                }
                toast.success(`Đã thêm ${item.json.type} mới!`);
                setDragPreview(null);
                setGuidelines([]);
                return {
                    moved: true,
                    newPosition: {
                        x: item.json.type === 'section' ? 0 : snapped.x,
                        y: item.json.type === 'section' ? lastSectionY + 10 : snapped.y,
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
                    width: '100%',
                    height: pageData.canvas.height ? `${pageData.canvas.height}px` : 'auto',
                    background: pageData.canvas.background,
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                    margin: '0 auto',
                    position: 'relative',
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
                                width: viewMode === 'mobile' ? '375px' : '1200px',
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
                                left: viewMode === 'mobile' ? 'calc(50% - 187.5px)' : 'calc(50% - 600px)',
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
                                left: viewMode === 'mobile' ? 'calc(50% + 187.5px)' : 'calc(50% + 600px)',
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