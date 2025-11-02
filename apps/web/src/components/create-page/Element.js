import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDrop, useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { toast } from 'react-toastify';
import SectionToolkit from './toolkitqick/SectionToolkit';
import { ItemTypes, getCanvasPosition, snapToGrid } from './helpers';
import eventController from '../../utils/EventUtils';
import { getResponsiveValues } from '../../utils/responsiveSync';
import ResizeHandles from './ResizeHandles';

/**
 * Utility to check if URL is valid
 */
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Reusable utility to generate locked styles for elements
 */
const getLockedStyles = (isLocked) =>
    useMemo(() => (isLocked ? { opacity: 0.7, cursor: 'not-allowed', pointerEvents: 'none' } : {}), [isLocked]);

/**
 * Get canvas width based on view mode
 */
const getCanvasWidth = (viewMode) => {
    switch (viewMode) {
        case 'mobile':
            return 375;
        case 'tablet':
            return 768;
        case 'desktop':
        default:
            return 1200;
    }
};

/**
 * ChildElement component for rendering draggable child elements within sections or popups
 */
const ChildElement = React.memo(
    ({
         parentId,
         id,
         type,
         componentData = {},
         styles = {},
         isSelected,
         onSelectChild,
         position,
         size,
         viewMode,
         visible = true,
         locked = false,
         onDeleteChild,
         onUpdateChildSize,
         element,
         zoomLevel = 1,
     }) => {
        const dragRef = useRef(null);

        // Get responsive values for current view mode
        const { size: responsiveSize, position: responsivePosition, styles: responsiveStyles } = useMemo(() => {
            if (element) {
                return getResponsiveValues(element, viewMode);
            }
            return {
                size: size || { width: type === 'icon' ? 50 : 200, height: type === 'icon' ? 50 : 50 },
                position: position || { x: 0, y: 0 },
                styles: styles || {},
            };
        }, [element, viewMode, size, position, styles, type]);

        const [{ isDragging }, drag] = useDrag({
            type: ItemTypes.CHILD_ELEMENT,
            canDrag: () => !locked && !componentData.locked,
            item: () => {
                if (locked || componentData.locked) {
                    toast.warning('Child element đã bị khóa!');
                    return null;
                }
                // FREE DRAG: Include full element data for conversion to top-level
                return {
                    childId: id,
                    parentId,
                    isExisting: true,
                    position: responsivePosition,
                    size: responsiveSize,
                    element: element, // Full element data
                    freeDrag: true, // Enable free drag mode
                };
            },
            collect: (monitor) => ({ isDragging: monitor.isDragging() }),
        }, [id, parentId, responsivePosition, responsiveSize, locked, componentData.locked, element]);

        const handleClick = useCallback(
            (e) => {
                console.log(`ChildElement ${id} (type: ${type}) clicked, parentId: ${parentId}`);
                if (typeof onSelectChild === 'function') {
                    onSelectChild(parentId, id);
                    console.log(`onSelectChild called with parentId: ${parentId}, id: ${id}`);
                }
                if (componentData.events?.onClick) {
                    eventController.handleEvent(componentData.events.onClick, id, true);
                }
            },
            [parentId, id, type, onSelectChild, componentData.events]
        );

        const handleDelete = useCallback(
            (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (typeof onDeleteChild === 'function' && !locked && !componentData.locked) {
                    onDeleteChild(parentId, id, e);
                    toast.success('Đã xóa thành phần con!');
                } else {
                    toast.warn('Không thể xóa: Element bị khóa!');
                }
            },
            [parentId, id, onDeleteChild, locked, componentData.locked]
        );

        const handleResize = useCallback(
            ({ width, height, x, y }) => {
                if (typeof onUpdateChildSize === 'function' && !locked && !componentData.locked) {
                    // Update both size and position if position changed (for resize from left/top)
                    if (x !== responsivePosition.x || y !== responsivePosition.y) {
                        // We need to update position too, but we don't have onUpdateChildPosition here
                        // For now, just update the size
                        onUpdateChildSize(parentId, id, { width, height });
                    } else {
                        onUpdateChildSize(parentId, id, { width, height });
                    }
                }
            },
            [parentId, id, onUpdateChildSize, locked, componentData.locked, responsivePosition]
        );

        useEffect(() => {
            if (!locked && !componentData.locked) {
                drag(dragRef);
            }
        }, [drag, locked, componentData.locked]);

        if (!visible || componentData.visible === false) {
            return null;
        }

        const lockedStyles = getLockedStyles(locked || componentData.locked);

        const getElementWidth = () => {
            return responsiveSize.width || (type === 'icon' ? 50 : type === 'gallery' ? 600 : 200);
        };

        const getElementHeight = () => {
            return responsiveSize.height || (type === 'icon' ? 50 : type === 'gallery' ? 600 : 50);
        };

        const wrapperStyles = useMemo(
            () => ({
                position: 'absolute',
                left: responsivePosition.x || 0,
                top: responsivePosition.y || 0,
                width: getElementWidth(),
                height: getElementHeight(),
                zIndex: isDragging ? 1000 : responsivePosition.z || 20,
                cursor: locked || componentData.locked ? 'not-allowed' : isDragging ? 'grabbing' : 'pointer',
                opacity: isDragging ? 0.5 : 1,
                pointerEvents: 'auto',
                ...lockedStyles,
            }),
            [responsivePosition, type, isDragging, locked, componentData.locked, lockedStyles, responsiveSize]
        );

        const contentStyles = useMemo(
            () => ({
                width: '100%',
                height: '100%',
                pointerEvents: 'auto',
                userSelect: type === 'heading' || type === 'paragraph' ? 'text' : 'none',
                ...responsiveStyles,
            }),
            [type, responsiveStyles]
        );

        return (
            <div
                className={`lpb-child-element ${isSelected ? 'lpb-child-element-selected' : ''} ${
                    isDragging ? 'lpb-child-element-dragging' : ''
                } ${locked || componentData.locked ? 'lpb-element-locked' : ''}`}
                style={wrapperStyles}
                onClick={handleClick}
            >
                <div
                    ref={dragRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        pointerEvents: 'auto',
                    }}
                >
                    {renderComponentContent(
                        element.type,
                        element.componentData || {},
                        contentStyles,
                        element.children || [],
                        true,
                        onSelectChild,
                        element.id,
                        null,
                        false,
                        viewMode
                    )}
                </div>
                {(locked || componentData.locked) && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            zIndex: 10001,
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            pointerEvents: 'none',
                        }}
                    >
                        <i className="fas fa-lock" />
                    </div>
                )}
                {isSelected && (
                    <>
                        <button
                            onClick={handleDelete}
                            style={{
                                position: 'absolute',
                                top: '2px',
                                left: '2px',
                                zIndex: 10002,
                                borderRadius: '50%',
                                background: '#ff7b7b',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '16px',
                                cursor: 'pointer',
                                padding: '6px',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <i className="fas fa-trash-alt" />
                        </button>
                        {!locked && !componentData.locked && (
                            <ResizeHandles
                                elementId={id}
                                currentSize={responsiveSize}
                                currentPosition={responsivePosition}
                                onResize={handleResize}
                                zoomLevel={zoomLevel}
                                minWidth={type === 'icon' ? 30 : 50}
                                minHeight={type === 'icon' ? 30 : 30}
                            />
                        )}
                    </>
                )}
            </div>
        );
    }
);

/**
 * Element component for rendering sections, popups, or other canvas elements
 */
const Element = React.memo(
    ({
         element,
         isSelected,
         onSelectElement,
         onUpdatePosition,
         onUpdateSize,
         viewMode,
         zoomLevel,
         gridSize,
         onContextMenu,
         canvasBounds,
         canvasRef,
         onSelectChild,
         selectedChildId,
         onAddChild,
         onUpdateChildPosition,
         onUpdateChildSize,
         onMoveChild,
         showGrid,
         setDragPreview,
         visibleElements = [],
         onCloseElement,
         onSaveTemplate,
         onToggleVisibility,
         onEditElement,
         onMoveElementUp,
         onMoveElementDown,
         onDeleteElement,
         onDeleteChild,
     }) => {
        const {
            id,
            type,
            componentData = {},
            children = [],
            visible = true,
            locked = false,
        } = element;

        // Get responsive values for current view mode
        const { size: responsiveSize, position: responsivePosition, styles: responsiveStyles } = useMemo(
            () => getResponsiveValues(element, viewMode),
            [element, viewMode]
        );

        const canvasWidth = getCanvasWidth(viewMode);

        const elementRef = useRef(null);
        const containerRef = useRef(null);

        const [{ isDragging }, drag, preview] = useDrag({
            type: ItemTypes.EXISTING_ELEMENT,
            canDrag: () => !locked && type !== 'section' && type !== 'popup',
            item: () => {
                if (locked) {
                    toast.warning('Element đã bị khóa!');
                    return null;
                }
                return {
                    id,
                    elementSize: responsiveSize,
                    elementPosition: responsivePosition,
                    isExisting: true,
                };
            },
            collect: (monitor) => ({ isDragging: monitor.isDragging() }),
        }, [id, responsiveSize, responsivePosition, locked, type]);

        const snapPoints = useMemo(() => {
            const points = [
                { x: 0, y: 0 },
                { x: responsiveSize.width, y: responsiveSize.height },
                { x: responsiveSize.width / 2, y: responsiveSize.height / 2 },
            ];
            children.forEach((child) => {
                const childResponsive = getResponsiveValues(child, viewMode);
                const bounds = {
                    left: childResponsive.position.x,
                    top: childResponsive.position.y,
                    right: childResponsive.position.x + childResponsive.size.width,
                    bottom: childResponsive.position.y + childResponsive.size.height,
                    centerX: childResponsive.position.x + childResponsive.size.width / 2,
                    centerY: childResponsive.position.y + childResponsive.size.height / 2,
                };
                points.push(
                    { x: bounds.left, y: bounds.top },
                    { x: bounds.right, y: bounds.bottom },
                    { x: bounds.centerX, y: bounds.centerY }
                );
            });
            return points;
        }, [responsiveSize, children, viewMode]);

        const [{ isOverContainer, canDropContainer }, dropSection] = useDrop({
            accept: [ItemTypes.ELEMENT, ItemTypes.CHILD_ELEMENT],
            canDrop: (item, monitor) => {
                // FREE MODE: More permissive drop zones
                // Allow drop in sections, popups, and containers
                if (type !== 'section' && type !== 'popup' && type !== 'container') {
                    return false;
                }
                // Allow all drag types for maximum flexibility
                return true;
            },
            drop: (item, monitor) => {
                if (!monitor.canDrop() || !containerRef.current) return { moved: false };
                const clientOffset = monitor.getClientOffset();
                if (!clientOffset) return { moved: false };
                const pos = getCanvasPosition(clientOffset.x, clientOffset.y, containerRef.current, zoomLevel);
                // FREE MODE: Disable snapping for smooth positioning
                const snapped = snapToGrid(pos.x, pos.y, gridSize, snapPoints, showGrid);

                if (monitor.getItemType() === ItemTypes.ELEMENT) {
                    const newId = `${item.id}-${Date.now()}`;
                    const newChild = {
                        id: newId,
                        type: item.json.type,
                        componentData: item.json.componentData || {},
                        position: {
                            [viewMode]: snapped,
                            desktop: snapped,
                            tablet: snapped,
                            mobile: snapped,
                        },
                        size: item.json.size || { width: 200, height: 50 },
                        styles: item.json.styles || {},
                        children: [],
                        visible: true,
                        locked: false,
                    };
                    onAddChild(id, newChild);
                    toast.success('Đã thêm thành phần con vào section!');
                    setDragPreview(null);
                    return { moved: true, newPosition: snapped };
                } else if (monitor.getItemType() === ItemTypes.CHILD_ELEMENT) {
                    if (item.parentId === id) {
                        onUpdateChildPosition(id, item.childId, snapped);
                        toast.success('Đã di chuyển thành phần con trong section!');
                    } else {
                        onMoveChild(item.parentId, item.childId, id, snapped);
                        toast.success('Đã di chuyển thành phần con sang section khác!');
                    }
                    setDragPreview(null);
                    return { moved: true, newPosition: snapped };
                }
                setDragPreview(null);
                return { moved: false };
            },
            collect: (monitor) => ({
                isOverContainer: monitor.isOver(),
                canDropContainer: monitor.canDrop(),
            }),
        }, [id, type, componentData, viewMode, zoomLevel, gridSize, showGrid, onAddChild, onUpdateChildPosition, onMoveChild]);

        const [{ isOverPopup, canDropPopup }, dropPopup] = useDrop({
            accept: [ItemTypes.ELEMENT, ItemTypes.CHILD_ELEMENT],
            canDrop: () => type === 'popup',
            drop: (item, monitor) => {
                if (!containerRef.current) return { moved: false };
                const clientOffset = monitor.getClientOffset();
                if (!clientOffset) return { moved: false };
                const pos = getCanvasPosition(clientOffset.x, clientOffset.y, containerRef.current, zoomLevel);
                // FREE MODE: Smooth positioning without grid constraints
                const snapped = snapToGrid(pos.x, pos.y, gridSize, snapPoints, showGrid);

                if (monitor.getItemType() === ItemTypes.ELEMENT) {
                    const newId = `${item.id}-${Date.now()}`;
                    const newChild = {
                        id: newId,
                        type: item.json.type,
                        componentData: item.json.componentData || {},
                        position: {
                            [viewMode]: snapped,
                            desktop: snapped,
                            tablet: snapped,
                            mobile: snapped,
                        },
                        size: item.json.size || { width: 200, height: 50 },
                        styles: item.json.styles || {},
                        children: [],
                        visible: true,
                        locked: false,
                    };
                    onAddChild(id, newChild);
                    toast.success('Đã thêm thành phần con vào popup!');
                    setDragPreview(null);
                    return { moved: true, newPosition: snapped };
                } else if (monitor.getItemType() === ItemTypes.CHILD_ELEMENT) {
                    if (item.parentId === id) {
                        onUpdateChildPosition(id, item.childId, snapped);
                        toast.success('Đã di chuyển thành phần con trong popup!');
                    } else {
                        onMoveChild(item.parentId, item.childId, id, snapped);
                        toast.success('Đã di chuyển thành phần con sang popup khác!');
                    }
                    setDragPreview(null);
                    return { moved: true, newPosition: snapped };
                }
                setDragPreview(null);
                return { moved: false };
            },
            collect: (monitor) => ({
                isOverPopup: monitor.isOver(),
                canDropPopup: monitor.canDrop(),
            }),
        }, [id, type, viewMode, zoomLevel, gridSize, showGrid, onAddChild, onUpdateChildPosition, onMoveChild]);

        const lockedStyles = getLockedStyles(locked);

        const animationStyles = useMemo(
            () => ({
                animation: componentData.animation?.onLoad
                    ? `${componentData.animation.onLoad} ${componentData.animation?.duration || 1000}ms ease`
                    : componentData.animation?.type
                        ? `${componentData.animation.type} ${componentData.animation?.duration || 1000}ms ease ${componentData.animation?.delay || 0}ms ${componentData.animation?.repeat ? 'infinite' : ''}`
                        : 'none',
            }),
            [componentData.animation]
        );
        const sectionStyles = useMemo(() => {
            const bgImage = componentData.backgroundImage ||
                responsiveStyles.backgroundImage ||
                '';

            const bgType = componentData.backgroundType ||
                (bgImage ? 'image' : 'color');

            console.log(`Section ${id} (${viewMode}) - BG Type: ${bgType}, Canvas Width: ${canvasWidth}px`);

            // FIXED: Use responsive size based on viewMode
            const sectionHeight = viewMode === 'mobile' && element.mobileSize?.height
                ? element.mobileSize.height
                : viewMode === 'tablet' && element.tabletSize?.height
                    ? element.tabletSize.height
                    : responsiveSize.height || element.size?.height || 400;

            return {
                position: 'absolute',
                top: responsivePosition.y || 0,
                width: `${canvasWidth}px`,
                height: `${sectionHeight}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: responsivePosition.z || 1,
                userSelect: 'none',
                overflow: 'visible',
                boxSizing: 'border-box',
                ...responsiveStyles,
                // ✅ SIMPLIFIED BACKGROUND LOGIC
                backgroundColor: bgType === 'color' ?
                    (componentData.backgroundColor || responsiveStyles.backgroundColor || '#ffffff') :
                    'transparent',
                backgroundImage: bgType === 'image' && bgImage ?
                    `url("${bgImage}")` :
                    'none',
                backgroundSize: componentData.backgroundSize || 'cover',
                backgroundPosition: componentData.backgroundPosition || 'center',
                backgroundRepeat: componentData.backgroundRepeat || 'no-repeat',
                backgroundAttachment: 'scroll',
                // Gradient fallback
                background: bgType === 'gradient' ?
                    (componentData.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)') :
                    undefined,
                ...animationStyles,
                ...lockedStyles,
            };
        }, [responsivePosition, responsiveSize, canvasWidth, componentData, responsiveStyles, animationStyles, lockedStyles, viewMode, element]);

        const popupStyles = useMemo(() => {
            // FIXED: Better responsive popup sizing
            const popupWidth = viewMode === 'mobile' && element.mobileSize?.width
                ? element.mobileSize.width
                : viewMode === 'tablet' && element.tabletSize?.width
                    ? element.tabletSize.width
                    : responsiveSize.width || 600;

            const popupHeight = viewMode === 'mobile' && element.mobileSize?.height
                ? element.mobileSize.height
                : viewMode === 'tablet' && element.tabletSize?.height
                    ? element.tabletSize.height
                    : responsiveSize.height || 400;

            return {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: viewMode === 'mobile' ? `min(${popupWidth}px, 90%)` : `${popupWidth}px`,
                maxWidth: viewMode === 'mobile' ? '90%' : '100%',
                minHeight: `${popupHeight}px`,
                maxHeight: '90vh',
                zIndex: 1001,
                background: componentData.background || responsiveStyles.background || 'rgba(255, 255, 255, 0.95)',
                borderRadius: componentData.borderRadius || '12px',
                boxShadow: isSelected ? '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 3px #3b82f6' : '0 8px 32px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease, opacity 0.3s ease, transform 0.3s ease',
                opacity: 1,
                transformOrigin: 'center',
                cursor: locked ? 'not-allowed' : 'default',
                boxSizing: 'border-box',
                ...responsiveStyles,
                ...lockedStyles,
                ...animationStyles,
            };
        }, [viewMode, responsiveSize, componentData, isSelected, responsiveStyles, lockedStyles, animationStyles, element]);

        useEffect(() => {
            preview(getEmptyImage(), { captureDraggingState: true });
        }, [preview]);

        useEffect(() => {
            if (type === 'section' && componentData?.structure === 'ladi-standard') {
                dropSection(containerRef);
            } else if (type === 'popup') {
                dropPopup(containerRef);
            }
        }, [dropSection, dropPopup, type, componentData]);

        const handleMouseDown = useCallback(
            (e) => {
                if (locked) {
                    toast.warning('Element đã bị khóa!');
                    return;
                }
                if (!e.target.closest('button')) {
                    e.stopPropagation();
                    if (typeof onSelectElement === 'function') {
                        onSelectElement([id], e.ctrlKey);
                    }
                    onSelectChild(id, null);
                    console.log(`Element ${id} selected`);
                }
            },
            [id, locked, onSelectElement, onSelectChild]
        );

        const handleClick = useCallback(
            (e) => {
                e.stopPropagation();
                if (componentData.events?.onClick) {
                    eventController.handleEvent(componentData.events.onClick, id, true);
                }
            },
            [id, componentData.events]
        );

        const handleContextMenu = useCallback(
            (e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(id, { x: e.clientX, y: e.clientY });
            },
            [id, onContextMenu]
        );

        const handleParentResize = useCallback(
            ({ width, height, x, y }) => {
                if (typeof onUpdateSize === 'function' && !locked) {
                    // For parent elements, just update the size
                    onUpdateSize(id, { width, height });

                    // Note: Position updates for sections/popups are typically not needed
                    // as they're positioned relative to the canvas
                }
            },
            [id, onUpdateSize, locked]
        );

        if (!visible) {
            return null;
        }

        const isPopup = type === 'popup';
        const shouldShowElement = type === 'section' || isSelected || visibleElements.includes(id);
        if (isPopup && !shouldShowElement) {
            return null;
        }

        if (type === 'section' && componentData?.structure === 'ladi-standard') {
            const bgType = componentData.backgroundType || 'color';
            const bgImage = componentData.backgroundImage || '';
            const bgColor = componentData.backgroundColor || '#ffffff';

            console.log(`🎨 Section ${id} Render:`, { bgType, bgImage, bgColor });

            return (
                <div
                    ref={elementRef}
                    data-element-id={id}
                    className={`lpb-canvas-element ${isSelected ? 'lpb-canvas-element-selected' : ''} ${locked ? 'lpb-element-locked' : ''}`}
                    style={sectionStyles}
                    onMouseDown={locked ? undefined : handleMouseDown}
                    onContextMenu={handleContextMenu}
                >
                    {locked && (
                        <div style={{ /* lock badge styles */ }}>
                            <i className="fas fa-lock" /> Section Locked
                        </div>
                    )}

                    <div className="ladi-section" style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        isolation: 'isolate'
                    }}>

                        {/* ✅ SIMPLIFIED BACKGROUND */}
                        <div
                            className="ladi-section-background"
                            style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                zIndex: 0,
                                pointerEvents: 'none',
                                backgroundColor: bgType === 'color' ? bgColor : 'transparent',
                                backgroundImage: bgType === 'image' && bgImage ? `url("${bgImage}")` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                            }}
                        />
                        <div
                            className="ladi-overlay"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 1,
                                pointerEvents: 'none',
                                backgroundColor: componentData.overlayColor || responsiveStyles.overlayColor || 'transparent',
                                opacity: componentData.overlayOpacity !== undefined ? componentData.overlayOpacity : (responsiveStyles.overlayOpacity || 0),
                            }}
                        />
                        <div
                            ref={containerRef}
                            className={`ladi-container ${isOverContainer && canDropContainer ? 'lpb-child-element-hover' : ''}`}
                            style={{
                                position: 'relative',
                                zIndex: 10,
                                padding: componentData.padding || responsiveStyles.padding || '20px',
                                width: '100%',
                                height: '100%',
                                border: isOverContainer && canDropContainer ? '2px dashed #2563eb' : 'none',
                                pointerEvents: 'auto',
                            }}
                        >
                            {children.map((child) => (
                                <ChildElement
                                    key={child.id}
                                    parentId={id}
                                    id={child.id}
                                    type={child.type}
                                    element={child}
                                    componentData={child.componentData || {}}
                                    styles={child.styles || {}}
                                    position={child.position || {}}
                                    size={child.size || { width: 200, height: 50 }}
                                    visible={child.visible !== false}
                                    locked={child.locked || false}
                                    isSelected={selectedChildId === child.id}
                                    onSelectChild={onSelectChild}
                                    zoomLevel={zoomLevel}
                                    gridSize={gridSize}
                                    showGrid={showGrid}
                                    onUpdateChildPosition={onUpdateChildPosition}
                                    onUpdateChildSize={onUpdateChildSize}
                                    onMoveChild={onMoveChild}
                                    viewMode={viewMode}
                                    onDeleteChild={onDeleteChild}
                                />
                            ))}
                        </div>
                    </div>

                    {isSelected && (
                        <>
                            <SectionToolkit
                                element={element}
                                position={{ x: 0, y: 0 }}
                                onEdit={() => onEditElement(id)}
                                onSaveTemplate={onSaveTemplate}
                                onMoveUp={() => onMoveElementUp(id)}
                                onMoveDown={() => onMoveElementDown(id)}
                                onToggleVisibility={() => onToggleVisibility(id)}
                                onDelete={() => onDeleteElement(id)}
                            />
                            {!locked && (
                                <ResizeHandles
                                    elementId={id}
                                    currentSize={responsiveSize}
                                    currentPosition={responsivePosition}
                                    onResize={handleParentResize}
                                    zoomLevel={zoomLevel}
                                    minWidth={300}
                                    minHeight={200}
                                    maxWidth={getCanvasWidth(viewMode)}
                                />
                            )}
                        </>
                    )}
                </div>
            );
        }

        if (type === 'popup') {
            const shouldShowElement = type === 'section' || isSelected || visibleElements.includes(id);
            if (!shouldShowElement) {
                return null;
            }

            return (
                <>
                    <div
                        className="lpb-popup-backdrop"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 1000,
                            pointerEvents: 'auto',
                            opacity: 1,
                            transition: 'opacity 0.3s ease',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onCloseElement === 'function') {
                                onCloseElement(id);
                                eventController.dispatch('element-close', { elementId: id });
                            }
                        }}
                    />
                    <div
                        ref={elementRef}
                        data-element-id={id}
                        className={`lpb-popup-container ${isSelected ? 'lpb-popup-selected' : ''} ${locked ? 'lpb-element-locked' : ''}`}
                        style={popupStyles}
                        onMouseDown={locked ? undefined : handleMouseDown}
                        onContextMenu={handleContextMenu}
                    >
                        <div
                            className="lpb-popup-header"
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #e5e7eb',
                                background: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                                {componentData.title || 'Popup Title'}
                            </h3>
                            <button
                                className="lpb-popup-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (typeof onCloseElement === 'function') {
                                        onCloseElement(id);
                                        eventController.dispatch('element-close', { elementId: id });
                                    }
                                }}
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease',
                                    color: '#6b7280',
                                }}
                            >
                                <i className="fas fa-times" style={{ fontSize: '14px' }} />
                            </button>
                        </div>
                        <div
                            ref={containerRef}
                            className={`lpb-popup-content ${isOverPopup && canDropPopup ? 'lpb-popup-dropzone-active' : ''}`}
                            style={{
                                position: 'relative',
                                flex: 1,
                                padding: componentData.padding || '20px',
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                minHeight: '200px',
                                border: isOverPopup && canDropPopup ? '2px dashed #2563eb' : 'none',
                                background: isOverPopup && canDropPopup ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {children.length === 0 && (
                                <div
                                    className="lpb-popup-empty"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '200px',
                                        color: '#9ca3af',
                                        textAlign: 'center',
                                        padding: '40px 20px',
                                    }}
                                >
                                    <i
                                        className="fas fa-hand-pointer"
                                        style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3, color: '#d1d5db' }}
                                    />
                                    <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                                        Kéo thả elements vào đây
                                    </p>
                                    <small style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Popup có thể chứa bất kỳ element nào
                                    </small>
                                </div>
                            )}
                            {children.map((child) => (
                                <ChildElement
                                    key={child.id}
                                    parentId={id}
                                    id={child.id}
                                    type={child.type}
                                    element={child}
                                    componentData={child.componentData || {}}
                                    styles={child.styles || {}}
                                    position={child.position || {}}
                                    size={child.size || { width: 200, height: 50 }}
                                    visible={child.visible !== false}
                                    locked={child.locked || false}
                                    isSelected={selectedChildId === child.id}
                                    onSelectChild={onSelectChild}
                                    zoomLevel={zoomLevel}
                                    gridSize={gridSize}
                                    showGrid={showGrid}
                                    onUpdateChildPosition={onUpdateChildPosition}
                                    onUpdateChildSize={onUpdateChildSize}
                                    onMoveChild={onMoveChild}
                                    viewMode={viewMode}
                                    onDeleteChild={onDeleteChild}
                                />
                            ))}
                        </div>
                        {locked && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px',
                                    zIndex: 10001,
                                    background: 'rgba(0,0,0,0.7)',
                                    color: '#fff',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    pointerEvents: 'none',
                                }}
                            >
                                <i className="fas fa-lock" /> Locked
                            </div>
                        )}
                        {isSelected && !locked && (
                            <ResizeHandles
                                elementId={id}
                                currentSize={responsiveSize}
                                currentPosition={responsivePosition}
                                onResize={handleParentResize}
                                zoomLevel={zoomLevel}
                                minWidth={300}
                                minHeight={200}
                                maxWidth={getCanvasWidth(viewMode)}
                            />
                        )}
                    </div>
                </>
            );
        }

        const commonElementStyles = useMemo(
            () => ({
                position: 'absolute',
                top: responsivePosition.y || 0,
                left: responsivePosition.x || 0,
                width: responsiveSize.width,
                height: responsiveSize.height,
                zIndex: responsivePosition.z || 1,
                opacity: isDragging ? 0.5 : 1,
                cursor: locked ? 'not-allowed' : isDragging ? 'grabbing' : 'pointer',
                userSelect: type === 'heading' || type === 'paragraph' ? 'text' : 'none',
                ...responsiveStyles,
                ...lockedStyles,
                ...animationStyles,
            }),
            [responsivePosition, responsiveSize, type, isDragging, locked, responsiveStyles, lockedStyles, animationStyles]
        );

        return (
            <div
                ref={(node) => {
                    elementRef.current = node;
                    if (!locked && type !== 'section' && type !== 'popup') {
                        drag(node);
                    }
                }}
                data-element-id={id}
                className={`lpb-canvas-element ${isSelected ? 'lpb-canvas-element-selected' : ''} ${isDragging ? 'lpb-canvas-element-dragging' : ''} ${locked ? 'lpb-element-locked' : ''}`}
                style={commonElementStyles}
                onMouseDown={locked ? undefined : handleMouseDown}
                onContextMenu={handleContextMenu}
                onClick={handleClick}
            >
                {locked && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            zIndex: 10001,
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            pointerEvents: 'none',
                        }}
                    >
                        <i className="fas fa-lock" /> Locked
                    </div>
                )}
                {renderComponentContent(
                    type,
                    componentData,
                    responsiveStyles,
                    children,
                    true,
                    onSelectChild,
                    id,
                    null,
                    false,
                    viewMode
                )}
            </div>
        );
    }
);

// PropTypes for ChildElement
ChildElement.propTypes = {
    parentId: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    element: PropTypes.object,
    componentData: PropTypes.shape({
        locked: PropTypes.bool,
        visible: PropTypes.bool,
        events: PropTypes.shape({
            onClick: PropTypes.object,
        }),
        src: PropTypes.string,
        alt: PropTypes.string,
        icon: PropTypes.string,
        images: PropTypes.arrayOf(
            PropTypes.shape({
                src: PropTypes.string,
                alt: PropTypes.string,
            })
        ),
    }),
    styles: PropTypes.object,
    isSelected: PropTypes.bool.isRequired,
    onSelectChild: PropTypes.func.isRequired,
    position: PropTypes.object.isRequired,
    size: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number,
    }),
    viewMode: PropTypes.oneOf(['desktop', 'tablet', 'mobile']).isRequired,
    visible: PropTypes.bool,
    locked: PropTypes.bool,
    onDeleteChild: PropTypes.func.isRequired,
};

// PropTypes for Element
Element.propTypes = {
    element: PropTypes.shape({
        id: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        componentData: PropTypes.object,
        position: PropTypes.object,
        size: PropTypes.object,
        styles: PropTypes.object,
        children: PropTypes.array,
        visible: PropTypes.bool,
        locked: PropTypes.bool,
    }).isRequired,
    isSelected: PropTypes.bool.isRequired,
    onSelectElement: PropTypes.func.isRequired,
    onUpdatePosition: PropTypes.func.isRequired,
    onUpdateSize: PropTypes.func.isRequired,
    viewMode: PropTypes.oneOf(['desktop', 'tablet', 'mobile']).isRequired,
    zoomLevel: PropTypes.number.isRequired,
    gridSize: PropTypes.number.isRequired,
    onContextMenu: PropTypes.func.isRequired,
    canvasBounds: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number,
    }).isRequired,
    canvasRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
    onSelectChild: PropTypes.func.isRequired,
    selectedChildId: PropTypes.string,
    onAddChild: PropTypes.func.isRequired,
    onUpdateChildPosition: PropTypes.func.isRequired,
    onUpdateChildSize: PropTypes.func.isRequired,
    onMoveChild: PropTypes.func.isRequired,
    showGrid: PropTypes.bool.isRequired,
    setDragPreview: PropTypes.func.isRequired,
    visibleElements: PropTypes.arrayOf(PropTypes.string),
    onCloseElement: PropTypes.func.isRequired,
    onSaveTemplate: PropTypes.func.isRequired,
    onToggleVisibility: PropTypes.func.isRequired,
    onEditElement: PropTypes.func.isRequired,
    onMoveElementUp: PropTypes.func.isRequired,
    onMoveElementDown: PropTypes.func.isRequired,
    onDeleteElement: PropTypes.func.isRequired,
    onDeleteChild: PropTypes.func.isRequired,
};

/**
 * Fixed renderComponentContent function with proper gallery, icon, and button rendering
 */
export const renderComponentContent = (
    elementType,
    componentData = {},
    styles = {},
    children = [],
    isCanvas,
    onSelectChild,
    parentId,
    childId,
    isTemplateMode,
    viewMode
) => {
    console.log(`Rendering elementType: ${elementType}, parentId: ${parentId}, childId: ${childId}`);

    const textStyles = {
        pointerEvents: 'auto',
        userSelect: 'text',
        cursor: 'pointer',
        ...styles,
    };

    const mediaStyles = {
        pointerEvents: 'auto',
        cursor: 'pointer',
        width: '100%',
        height: '100%',
        objectFit: styles.objectFit || 'cover',
        ...styles,
    };

    switch (elementType) {
        case 'heading':
            return (
                <h1 style={textStyles} data-element-id={childId}>
                    {componentData.content || 'Default Heading'}
                </h1>
            );

        case 'paragraph':
            return (
                <p style={textStyles} data-element-id={childId}>
                    {componentData.content || 'Default Paragraph'}
                </p>
            );

        case 'gallery':
            const images = componentData.images || [];
            const galleryImages = Array.isArray(images) ? images : [];

            return (
                <div
                    style={{
                        display: styles.display || 'grid',
                        gridTemplateColumns: styles.gridTemplateColumns || 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: styles.gap || '16px',
                        padding: styles.padding || '16px',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        width: '100%',
                        height: '100%',
                        ...styles,
                    }}
                    data-element-id={childId}
                >
                    {galleryImages.length > 0 ? (
                        galleryImages.map((image, index) => {
                            const imageSrc = typeof image === 'string'
                                ? image
                                : (image.src || image.url || 'https://via.placeholder.com/150?text=Image');
                            const imageAlt = typeof image === 'string'
                                ? `Image ${index + 1}`
                                : (image.alt || `Image ${index + 1}`);

                            return (
                                <img
                                    key={index}
                                    src={imageSrc}
                                    alt={imageAlt}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        objectFit: styles.objectFit || 'cover',
                                        borderRadius: styles.borderRadius || '8px',
                                        transition: styles[':hover'] ? 'all 0.3s ease' : 'none',
                                        cursor: 'pointer',
                                    }}
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/150?text=Error';
                                    }}
                                />
                            );
                        })
                    ) : (
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                minHeight: '200px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '8px',
                                color: '#9ca3af',
                            }}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <i className="fas fa-images" style={{ fontSize: '48px', marginBottom: '8px' }} />
                                <p>Gallery Placeholder</p>
                            </div>
                        </div>
                    )}
                </div>
            );

        case 'icon':
            return (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        ...styles,
                    }}
                    data-element-id={childId}
                >
                    {componentData.imageUrl ? (
                        <img
                            src={componentData.imageUrl}
                            alt={componentData.alt || componentData.title || 'Icon'}
                            style={{
                                width: '100%',
                                height: '100%',
                                maxWidth: '50px',
                                maxHeight: '50px',
                                objectFit: 'contain',
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<i class="fas fa-exclamation-circle" style="font-size: 24px; color: #ef4444;"></i>';
                            }}
                        />
                    ) : componentData.icon && componentData.icon.includes('<svg') ? (
                        <div
                            dangerouslySetInnerHTML={{ __html: componentData.icon }}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        />
                    ) : componentData.src ? (
                        <img
                            src={componentData.src}
                            alt={componentData.alt || 'Icon'}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<i class="fas fa-star" style="font-size: 24px; color: #f59e0b;"></i>';
                            }}
                        />
                    ) : (
                        <i
                            className={componentData.icon || 'fas fa-star'}
                            style={{
                                fontSize: styles.fontSize || '24px',
                                color: styles.color || '#000',
                            }}
                        />
                    )}
                </div>
            );

        case 'image':
            return (
                <img
                    src={componentData.src || 'https://via.placeholder.com/200?text=Image'}
                    alt={componentData.alt || 'Image'}
                    style={mediaStyles}
                    data-element-id={childId}
                    onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200?text=Error';
                    }}
                />
            );

        case 'button':
            const buttonStyles = {
                padding: componentData.padding || styles.padding || '10px 20px',
                borderRadius: componentData.borderRadius || styles.borderRadius || '4px',
                background: componentData.background || styles.background || '#007bff',
                color: componentData.color || styles.color || '#fff',
                border: styles.border || 'none',
                cursor: 'pointer',
                fontFamily: styles.fontFamily || 'inherit',
                fontSize: styles.fontSize || '16px',
                fontWeight: styles.fontWeight || '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                transition: styles.transition || 'all 0.3s ease',
                boxShadow: styles.boxShadow || 'none',
                ...styles,
                pointerEvents: 'auto',
            };

            const { ':hover': hover, ':active': active, '@keyframes': keyframes, ...cleanStyles } = buttonStyles;

            return (
                <button
                    style={cleanStyles}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (componentData.events?.onClick) {
                            eventController.handleEvent(componentData.events.onClick, childId || parentId, isCanvas);
                        }
                    }}
                    onMouseEnter={(e) => {
                        if (styles[':hover']) {
                            Object.assign(e.target.style, styles[':hover']);
                        }
                    }}
                    onMouseLeave={(e) => {
                        Object.assign(e.target.style, cleanStyles);
                    }}
                    onMouseDown={(e) => {
                        if (styles[':active']) {
                            Object.assign(e.target.style, styles[':active']);
                        }
                    }}
                    onMouseUp={(e) => {
                        Object.assign(e.target.style, cleanStyles);
                    }}
                    data-element-id={childId}
                >
                    {componentData.content || 'Button'}
                </button>
            );

        case 'video':
            return (
                <video
                    controls
                    src={componentData.src || 'https://www.w3schools.com/html/mov_bbb.mp4'}
                    style={mediaStyles}
                    data-element-id={childId}
                >
                    Your browser does not support the video tag.
                </video>
            );

        case 'section':
            return (
                <div className="ladi-section" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}>
                    <div className="ladi-container" style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
                        {children.map((child) => {
                            if (!child.type || !child.id) {
                                console.warn('Invalid child:', child);
                                return null;
                            }
                            return (
                                <ChildElement
                                    key={child.id}
                                    parentId={parentId}
                                    id={child.id}
                                    type={child.type}
                                    element={child}
                                    componentData={child.componentData || {}}
                                    styles={child.styles || {}}
                                    position={child.position || {}}
                                    size={child.size || { width: 200, height: 50 }}
                                    visible={child.visible !== false}
                                    locked={child.locked || false}
                                    isSelected={childId === child.id}
                                    onSelectChild={onSelectChild}
                                    viewMode={viewMode}
                                    onDeleteChild={onDeleteChild}
                                />
                            );
                        })}
                    </div>
                </div>
            );

        default:
            return (
                <div
                    style={{
                        ...styles,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                        padding: '20px',
                        borderRadius: '8px',
                    }}
                >
                    Unsupported element type: {elementType}
                </div>
            );
    }
};

export { ChildElement, Element };