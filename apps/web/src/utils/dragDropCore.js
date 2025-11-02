/**
 * Drag & Drop Core Utilities
 * Following LadiPage's 3-layer architecture
 *
 * Layers:
 * 1. UI Layer: Mouse tracking, visual feedback
 * 2. Logic Layer: Coordinate transformation, snap-to-grid, collision detection
 * 3. Data Layer: JSON state management
 */

// ============================================
// CONSTANTS
// ============================================

export const BREAKPOINTS = {
    desktop: 1200,
    tablet: 768,
    mobile: 375,
};

export const DEFAULT_GRID_SIZE = 10;
export const SNAP_TOLERANCE = 10;
export const COLLISION_PADDING = 5;

// ============================================
// LAYER 2: LOGIC LAYER - Coordinate Transformation
// ============================================

/**
 * Transform mouse coordinates to canvas coordinates
 * Handles zoom level and scroll offset
 *
 * @param {number} clientX - Mouse X position (from event)
 * @param {number} clientY - Mouse Y position (from event)
 * @param {DOMRect} containerRect - Canvas container bounding rect
 * @param {number} zoom - Zoom level (100 = 1x, 50 = 0.5x, 150 = 1.5x)
 * @param {number} scrollX - Container scroll X offset (default 0)
 * @param {number} scrollY - Container scroll Y offset (default 0)
 * @returns {{x: number, y: number}} Canvas coordinates
 */
export const transformCoordinates = (
    clientX,
    clientY,
    containerRect,
    zoom = 100,
    scrollX = 0,
    scrollY = 0
) => {
    if (!containerRect) {
        console.warn('transformCoordinates: containerRect is null');
        return { x: 0, y: 0 };
    }

    const zoomFactor = zoom / 100;

    // Step 1: Convert client coordinates to container-relative coordinates
    const relativeX = clientX - containerRect.left;
    const relativeY = clientY - containerRect.top;

    // Step 2: Apply zoom transformation
    const canvasX = (relativeX / zoomFactor) + scrollX;
    const canvasY = (relativeY / zoomFactor) + scrollY;

    // Step 3: Round to avoid sub-pixel rendering issues
    return {
        x: Math.round(canvasX),
        y: Math.round(canvasY),
    };
};

/**
 * Transform canvas coordinates back to client coordinates
 * Useful for rendering visual feedback
 */
export const transformToClient = (canvasX, canvasY, containerRect, zoom = 100) => {
    if (!containerRect) return { x: 0, y: 0 };

    const zoomFactor = zoom / 100;
    return {
        x: Math.round(canvasX * zoomFactor + containerRect.left),
        y: Math.round(canvasY * zoomFactor + containerRect.top),
    };
};

// ============================================
// LAYER 2: LOGIC LAYER - Snap to Grid
// ============================================

/**
 * Snap coordinates to grid
 * Algorithm: x = round(x / gridSize) * gridSize
 *
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} gridSize - Grid size in pixels (default 10)
 * @param {boolean} enabled - Enable/disable snapping
 * @returns {{x: number, y: number}} Snapped coordinates
 */
export const snapToGrid = (x, y, gridSize = DEFAULT_GRID_SIZE, enabled = true) => {
    if (!enabled || gridSize <= 1) {
        return { x: Math.round(x), y: Math.round(y) };
    }

    return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize,
    };
};

/**
 * Snap to alignment guides (smart snapping)
 * Snaps to edges/centers of nearby elements
 *
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Array} snapPoints - Array of {x, y} snap points
 * @param {number} tolerance - Snap tolerance in pixels
 * @returns {{x: number, y: number, snappedX: boolean, snappedY: boolean}}
 */
export const snapToGuides = (x, y, snapPoints = [], tolerance = SNAP_TOLERANCE) => {
    let snappedX = x;
    let snappedY = y;
    let didSnapX = false;
    let didSnapY = false;

    snapPoints.forEach((point) => {
        if (!point) return;

        // Snap X coordinate
        if (typeof point.x === 'number' && Math.abs(x - point.x) < tolerance) {
            snappedX = point.x;
            didSnapX = true;
        }

        // Snap Y coordinate
        if (typeof point.y === 'number' && Math.abs(y - point.y) < tolerance) {
            snappedY = point.y;
            didSnapY = true;
        }
    });

    return {
        x: snappedX,
        y: snappedY,
        snappedX: didSnapX,
        snappedY: didSnapY,
    };
};

/**
 * Generate snap points from elements
 * Returns edges and centers of all elements
 */
export const generateSnapPoints = (elements, viewMode = 'desktop') => {
    if (!elements || elements.length === 0) return [];

    const points = [];

    elements.forEach((element) => {
        const pos = element.position?.[viewMode] || { x: 0, y: 0 };
        const size = element.size || { width: 100, height: 100 };

        const left = pos.x;
        const right = pos.x + size.width;
        const top = pos.y;
        const bottom = pos.y + size.height;
        const centerX = pos.x + size.width / 2;
        const centerY = pos.y + size.height / 2;

        // Add all alignment points
        points.push(
            { x: left, y: null, type: 'left' },
            { x: right, y: null, type: 'right' },
            { x: centerX, y: null, type: 'centerX' },
            { x: null, y: top, type: 'top' },
            { x: null, y: bottom, type: 'bottom' },
            { x: null, y: centerY, type: 'centerY' }
        );
    });

    return points;
};

// ============================================
// LAYER 2: LOGIC LAYER - Collision Detection
// ============================================

/**
 * Detect collision between two elements (bounding box)
 *
 * @param {Object} element1 - First element {x, y, width, height}
 * @param {Object} element2 - Second element {x, y, width, height}
 * @param {number} padding - Collision padding/margin
 * @returns {boolean} True if elements collide
 */
export const detectCollision = (element1, element2, padding = COLLISION_PADDING) => {
    if (!element1 || !element2) return false;

    const e1 = {
        left: element1.x - padding,
        right: element1.x + element1.width + padding,
        top: element1.y - padding,
        bottom: element1.y + element1.height + padding,
    };

    const e2 = {
        left: element2.x,
        right: element2.x + element2.width,
        top: element2.y,
        bottom: element2.y + element2.height,
    };

    // AABB (Axis-Aligned Bounding Box) collision detection
    return (
        e1.left < e2.right &&
        e1.right > e2.left &&
        e1.top < e2.bottom &&
        e1.bottom > e2.top
    );
};

/**
 * Find all collisions for a given element
 *
 * @param {Object} element - Element to check
 * @param {Array} allElements - All elements to check against
 * @param {string} viewMode - Current view mode
 * @returns {Array} Array of colliding elements
 */
export const findCollisions = (element, allElements, viewMode = 'desktop') => {
    if (!element || !allElements) return [];

    const elementBox = {
        x: element.position?.[viewMode]?.x || 0,
        y: element.position?.[viewMode]?.y || 0,
        width: element.size?.width || 100,
        height: element.size?.height || 100,
    };

    return allElements
        .filter((el) => el.id !== element.id)
        .filter((el) => {
            const elBox = {
                x: el.position?.[viewMode]?.x || 0,
                y: el.position?.[viewMode]?.y || 0,
                width: el.size?.width || 100,
                height: el.size?.height || 100,
            };
            return detectCollision(elementBox, elBox);
        });
};

/**
 * Resolve collision by moving element
 * Pushes element to nearest non-colliding position
 */
export const resolveCollision = (element, collidingElement, direction = 'down') => {
    const padding = 16; // Spacing between elements

    if (direction === 'down') {
        return {
            x: element.x,
            y: collidingElement.y + collidingElement.height + padding,
        };
    } else if (direction === 'right') {
        return {
            x: collidingElement.x + collidingElement.width + padding,
            y: element.y,
        };
    }

    return { x: element.x, y: element.y };
};

// ============================================
// LAYER 2: LOGIC LAYER - Responsive Scaling
// ============================================

/**
 * Scale element from one viewport to another
 * Algorithm: newX = oldX * (newWidth / baseWidth)
 *
 * @param {Object} element - Element with position and size
 * @param {string} fromMode - Source viewport (desktop/tablet/mobile)
 * @param {string} toMode - Target viewport (desktop/tablet/mobile)
 * @returns {Object} Scaled position and size
 */
export const scaleToViewport = (element, fromMode = 'desktop', toMode = 'mobile') => {
    if (!element) return null;

    const fromWidth = BREAKPOINTS[fromMode] || BREAKPOINTS.desktop;
    const toWidth = BREAKPOINTS[toMode] || BREAKPOINTS.mobile;
    const scaleFactor = toWidth / fromWidth;

    const sourcePos = element.position?.[fromMode] || { x: 0, y: 0, z: 1 };
    const sourceSize = element.size || { width: 200, height: 100 };

    // Scale position
    let scaledX = Math.round(sourcePos.x * scaleFactor);
    let scaledY = Math.round(sourcePos.y * scaleFactor);

    // Scale size
    let scaledWidth = Math.round(sourceSize.width * scaleFactor);
    let scaledHeight = Math.round(sourceSize.height * scaleFactor);

    // Apply constraints for mobile (center horizontally, add padding)
    if (toMode === 'mobile') {
        const padding = 20;
        const maxWidth = toWidth - padding * 2;

        if (scaledWidth > maxWidth) {
            scaledWidth = maxWidth;
        }

        // Center horizontally
        scaledX = Math.max(padding, (toWidth - scaledWidth) / 2);
    }

    // Apply constraints for tablet
    if (toMode === 'tablet') {
        const padding = 30;
        const maxWidth = toWidth - padding * 2;

        if (scaledWidth > maxWidth) {
            scaledWidth = maxWidth;
        }

        // Clamp X position
        scaledX = Math.max(padding, Math.min(scaledX, toWidth - scaledWidth - padding));
    }

    return {
        position: {
            x: scaledX,
            y: scaledY,
            z: sourcePos.z || 1,
        },
        size: {
            width: scaledWidth,
            height: scaledHeight,
        },
    };
};

/**
 * Auto-scale element to all viewports
 * Creates desktop, tablet, and mobile positions
 */
export const autoScale = (element) => {
    if (!element) return element;

    // Assume desktop is the source
    const desktopPos = element.position?.desktop || { x: 0, y: 0, z: 1 };
    const desktopSize = element.size || { width: 200, height: 100 };

    // Scale to tablet
    const tablet = scaleToViewport(
        { position: { desktop: desktopPos }, size: desktopSize },
        'desktop',
        'tablet'
    );

    // Scale to mobile
    const mobile = scaleToViewport(
        { position: { desktop: desktopPos }, size: desktopSize },
        'desktop',
        'mobile'
    );

    return {
        ...element,
        position: {
            desktop: desktopPos,
            tablet: tablet.position,
            mobile: mobile.position,
        },
        tabletSize: tablet.size,
        mobileSize: mobile.size,
    };
};

// ============================================
// LAYER 3: DATA LAYER - JSON State Helpers
// ============================================

/**
 * Create element JSON structure
 * Standard format for all elements
 */
export const createElementData = (type, x, y, width, height, additionalProps = {}) => {
    return {
        id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        position: {
            desktop: { x, y, z: 1 },
            tablet: { x: 0, y: 0, z: 1 },
            mobile: { x: 0, y: 0, z: 1 },
        },
        size: { width, height },
        style: {},
        content: '',
        children: [],
        ...additionalProps,
    };
};

/**
 * Update element position in state
 * Immutable update pattern
 */
export const updateElementPosition = (element, x, y, viewMode = 'desktop') => {
    if (!element) return null;

    return {
        ...element,
        position: {
            ...element.position,
            [viewMode]: {
                ...(element.position?.[viewMode] || { z: 1 }),
                x,
                y,
            },
        },
    };
};

/**
 * Update element size in state
 */
export const updateElementSize = (element, width, height, viewMode = 'desktop') => {
    if (!element) return null;

    const sizeKey = viewMode === 'mobile' ? 'mobileSize' : viewMode === 'tablet' ? 'tabletSize' : 'size';

    return {
        ...element,
        [sizeKey]: { width, height },
    };
};

/**
 * Clamp position to canvas bounds
 * Prevent elements from going outside canvas
 */
export const clampToCanvas = (x, y, elementWidth, elementHeight, viewMode = 'desktop') => {
    const canvasWidth = BREAKPOINTS[viewMode];
    const minPadding = 0;
    const maxPadding = 20;

    return {
        x: Math.max(minPadding, Math.min(x, canvasWidth - elementWidth - maxPadding)),
        y: Math.max(minPadding, y),
    };
};

/**
 * Calculate element bounds
 */
export const getElementBounds = (element, viewMode = 'desktop') => {
    const pos = element.position?.[viewMode] || { x: 0, y: 0 };
    const size = element.size || { width: 100, height: 100 };

    return {
        left: pos.x,
        right: pos.x + size.width,
        top: pos.y,
        bottom: pos.y + size.height,
        centerX: pos.x + size.width / 2,
        centerY: pos.y + size.height / 2,
        width: size.width,
        height: size.height,
    };
};

// ============================================
// LAYER 1: UI LAYER - Mouse Tracking Helpers
// ============================================

/**
 * Throttle function for performance
 * Limits function calls during drag
 */
export const throttle = (func, delay = 16) => {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
};

/**
 * Request animation frame wrapper
 * Ensures smooth 60fps updates
 */
export const rafThrottle = (func) => {
    let rafId = null;
    return (...args) => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
            func(...args);
            rafId = null;
        });
    };
};

/**
 * Get drag offset from element corner
 * Used to maintain grab point during drag
 */
export const getDragOffset = (mouseX, mouseY, elementX, elementY) => {
    return {
        offsetX: mouseX - elementX,
        offsetY: mouseY - elementY,
    };
};

// ============================================
// UTILITIES
// ============================================

/**
 * Calculate distance between two points
 */
export const distance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Check if point is inside rectangle
 */
export const isPointInRect = (pointX, pointY, rect) => {
    return (
        pointX >= rect.x &&
        pointX <= rect.x + rect.width &&
        pointY >= rect.y &&
        pointY <= rect.y + rect.height
    );
};

/**
 * Deep clone object (for state immutability)
 */
export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

// ============================================
// EXPORTS
// ============================================

export default {
    // Constants
    BREAKPOINTS,
    DEFAULT_GRID_SIZE,
    SNAP_TOLERANCE,
    COLLISION_PADDING,

    // Coordinate transformation
    transformCoordinates,
    transformToClient,

    // Snap to grid
    snapToGrid,
    snapToGuides,
    generateSnapPoints,

    // Collision detection
    detectCollision,
    findCollisions,
    resolveCollision,

    // Responsive scaling
    scaleToViewport,
    autoScale,

    // JSON state helpers
    createElementData,
    updateElementPosition,
    updateElementSize,
    clampToCanvas,
    getElementBounds,

    // UI helpers
    throttle,
    rafThrottle,
    getDragOffset,

    // Utilities
    distance,
    isPointInRect,
    deepClone,
};
