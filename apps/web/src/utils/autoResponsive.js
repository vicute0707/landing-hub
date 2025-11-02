/**
 * Auto-Responsive Engine
 * Tự động tính toán responsive positions cho mobile/tablet từ desktop layout
 * với smart spacing và alignment
 */

/**
 * Calculate responsive breakpoints
 */
export const BREAKPOINTS = {
    desktop: 1200,
    tablet: 768,
    mobile: 375,
};

/**
 * Calculate scale factor between viewModes
 */
export const getScaleFactor = (fromMode, toMode) => {
    const from = BREAKPOINTS[fromMode] || BREAKPOINTS.desktop;
    const to = BREAKPOINTS[toMode] || BREAKPOINTS.mobile;
    return to / from;
};

/**
 * Calculate smart spacing between elements
 * Detects natural groupings and maintains relative spacing
 */
export const calculateSmartSpacing = (elements, viewMode = 'desktop') => {
    if (!elements || elements.length === 0) return [];

    // Sort by Y position (top to bottom)
    const sorted = [...elements].sort((a, b) => {
        const aY = a.position?.[viewMode]?.y || 0;
        const bY = b.position?.[viewMode]?.y || 0;
        return aY - bY;
    });

    const groups = [];
    let currentGroup = [sorted[0]];

    // Group elements by proximity (within 50px = same row)
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const prevY = prev.position?.[viewMode]?.y || 0;
        const currY = curr.position?.[viewMode]?.y || 0;

        if (Math.abs(currY - prevY) < 50) {
            currentGroup.push(curr);
        } else {
            groups.push(currentGroup);
            currentGroup = [curr];
        }
    }
    groups.push(currentGroup);

    return groups;
};

/**
 * Auto-convert desktop position to mobile with smart layout
 * - Stack vertically on mobile
 * - Maintain aspect ratios
 * - Smart spacing based on element types
 */
export const autoConvertToMobile = (element, canvasWidth = 375) => {
    if (!element) return element;

    const desktopPos = element.position?.desktop || { x: 0, y: 0, z: 1 };
    const desktopSize = element.size || { width: 200, height: 50 };

    // Scale factor from desktop to mobile
    const scale = canvasWidth / BREAKPOINTS.desktop;

    // Calculate responsive dimensions
    const mobileWidth = Math.min(
        Math.round(desktopSize.width * scale),
        canvasWidth - 40 // 20px padding on each side
    );

    const mobileHeight = Math.round(desktopSize.height * scale);

    // Calculate mobile position
    // Center horizontally, maintain relative vertical position
    const mobileX = Math.max(20, (canvasWidth - mobileWidth) / 2);
    const mobileY = Math.round(desktopPos.y * scale);

    return {
        ...element,
        position: {
            ...element.position,
            mobile: {
                x: mobileX,
                y: mobileY,
                z: desktopPos.z || 1,
            },
        },
        mobileSize: {
            width: mobileWidth,
            height: mobileHeight,
        },
    };
};

/**
 * Auto-convert desktop position to tablet
 */
export const autoConvertToTablet = (element, canvasWidth = 768) => {
    if (!element) return element;

    const desktopPos = element.position?.desktop || { x: 0, y: 0, z: 1 };
    const desktopSize = element.size || { width: 200, height: 50 };

    const scale = canvasWidth / BREAKPOINTS.desktop;

    const tabletWidth = Math.min(
        Math.round(desktopSize.width * scale),
        canvasWidth - 60 // 30px padding
    );

    const tabletHeight = Math.round(desktopSize.height * scale);

    // Tablet: scale proportionally, maintain layout closer to desktop
    const tabletX = Math.round(desktopPos.x * scale);
    const tabletY = Math.round(desktopPos.y * scale);

    return {
        ...element,
        position: {
            ...element.position,
            tablet: {
                x: Math.max(30, Math.min(tabletX, canvasWidth - tabletWidth - 30)),
                y: tabletY,
                z: desktopPos.z || 1,
            },
        },
        tabletSize: {
            width: tabletWidth,
            height: tabletHeight,
        },
    };
};

/**
 * Calculate alignment suggestions for current drag position
 * Returns array of snap points with alignment info
 */
export const calculateAlignmentGuides = (
    dragElement,
    allElements,
    viewMode = 'desktop',
    tolerance = 10
) => {
    if (!dragElement || !allElements) return [];

    const guides = [];
    const dragPos = dragElement.position?.[viewMode] || { x: 0, y: 0 };
    const dragSize = dragElement.size || { width: 200, height: 50 };

    const dragLeft = dragPos.x;
    const dragRight = dragPos.x + dragSize.width;
    const dragTop = dragPos.y;
    const dragBottom = dragPos.y + dragSize.height;
    const dragCenterX = dragPos.x + dragSize.width / 2;
    const dragCenterY = dragPos.y + dragSize.height / 2;

    allElements.forEach((el) => {
        if (el.id === dragElement.id) return;

        const elPos = el.position?.[viewMode] || { x: 0, y: 0 };
        const elSize = el.size || { width: 200, height: 50 };

        const elLeft = elPos.x;
        const elRight = elPos.x + elSize.width;
        const elTop = elPos.y;
        const elBottom = elPos.y + elSize.height;
        const elCenterX = elPos.x + elSize.width / 2;
        const elCenterY = elPos.y + elSize.height / 2;

        // Horizontal alignment guides
        if (Math.abs(dragLeft - elLeft) < tolerance) {
            guides.push({ type: 'vertical', position: elLeft, label: 'Align Left' });
        }
        if (Math.abs(dragRight - elRight) < tolerance) {
            guides.push({ type: 'vertical', position: elRight, label: 'Align Right' });
        }
        if (Math.abs(dragCenterX - elCenterX) < tolerance) {
            guides.push({ type: 'vertical', position: elCenterX, label: 'Align Center' });
        }

        // Vertical alignment guides
        if (Math.abs(dragTop - elTop) < tolerance) {
            guides.push({ type: 'horizontal', position: elTop, label: 'Align Top' });
        }
        if (Math.abs(dragBottom - elBottom) < tolerance) {
            guides.push({ type: 'horizontal', position: elBottom, label: 'Align Bottom' });
        }
        if (Math.abs(dragCenterY - elCenterY) < tolerance) {
            guides.push({ type: 'horizontal', position: elCenterY, label: 'Align Middle' });
        }

        // Spacing guides (equal spacing between elements)
        const horizontalGap = dragLeft - elRight;
        const verticalGap = dragTop - elBottom;

        if (horizontalGap > 0 && horizontalGap < 100) {
            guides.push({
                type: 'spacing',
                orientation: 'horizontal',
                gap: horizontalGap,
                label: `${horizontalGap}px gap`,
            });
        }

        if (verticalGap > 0 && verticalGap < 100) {
            guides.push({
                type: 'spacing',
                orientation: 'vertical',
                gap: verticalGap,
                label: `${verticalGap}px gap`,
            });
        }
    });

    return guides;
};

/**
 * Apply auto-responsive to all elements in a page
 */
export const applyAutoResponsive = (elements) => {
    if (!elements || elements.length === 0) return elements;

    return elements.map((element) => {
        let updatedElement = { ...element };

        // Auto-convert to tablet
        updatedElement = autoConvertToTablet(updatedElement);

        // Auto-convert to mobile
        updatedElement = autoConvertToMobile(updatedElement);

        // Recursively apply to children
        if (element.children && element.children.length > 0) {
            updatedElement.children = applyAutoResponsive(element.children);
        }

        return updatedElement;
    });
};

/**
 * Calculate optimal spacing for mobile stacking
 */
export const calculateMobileStacking = (elements) => {
    if (!elements || elements.length === 0) return elements;

    // Sort by desktop Y position
    const sorted = [...elements].sort((a, b) => {
        const aY = a.position?.desktop?.y || 0;
        const bY = b.position?.desktop?.y || 0;
        return aY - bY;
    });

    let currentY = 20; // Start with top padding
    const spacing = 16; // Default spacing between elements

    return sorted.map((element) => {
        const mobileSize = element.mobileSize || {
            width: Math.min(element.size?.width || 200, 335),
            height: element.size?.height || 50,
        };

        const mobileElement = {
            ...element,
            position: {
                ...element.position,
                mobile: {
                    x: (375 - mobileSize.width) / 2, // Center horizontally
                    y: currentY,
                    z: element.position?.desktop?.z || 1,
                },
            },
            mobileSize,
        };

        currentY += mobileSize.height + spacing;

        return mobileElement;
    });
};

/**
 * Detect and fix overlapping elements
 */
export const fixOverlaps = (elements, viewMode = 'desktop') => {
    if (!elements || elements.length === 0) return elements;

    const fixed = [...elements];
    const canvasWidth = BREAKPOINTS[viewMode];

    for (let i = 0; i < fixed.length; i++) {
        for (let j = i + 1; j < fixed.length; j++) {
            const el1 = fixed[i];
            const el2 = fixed[j];

            const pos1 = el1.position?.[viewMode] || { x: 0, y: 0 };
            const pos2 = el2.position?.[viewMode] || { x: 0, y: 0 };
            const size1 = el1.size || { width: 200, height: 50 };
            const size2 = el2.size || { width: 200, height: 50 };

            // Check overlap
            const overlap =
                pos1.x < pos2.x + size2.width &&
                pos1.x + size1.width > pos2.x &&
                pos1.y < pos2.y + size2.height &&
                pos1.y + size1.height > pos2.y;

            if (overlap) {
                // Push el2 down
                fixed[j] = {
                    ...el2,
                    position: {
                        ...el2.position,
                        [viewMode]: {
                            ...pos2,
                            y: pos1.y + size1.height + 16, // Add spacing
                        },
                    },
                };
            }
        }
    }

    return fixed;
};

/**
 * Smart resize - maintain aspect ratio and constraints
 */
export const smartResize = (element, newSize, viewMode = 'desktop') => {
    if (!element || !newSize) return element;

    const currentSize = element.size || { width: 200, height: 50 };
    const aspectRatio = currentSize.width / currentSize.height;

    // Constrain to canvas bounds
    const canvasWidth = BREAKPOINTS[viewMode];
    const maxWidth = canvasWidth - 40;

    let { width, height } = newSize;

    // Maintain aspect ratio if only one dimension changed
    if (width !== currentSize.width && height === currentSize.height) {
        height = Math.round(width / aspectRatio);
    } else if (height !== currentSize.height && width === currentSize.width) {
        width = Math.round(height * aspectRatio);
    }

    // Constrain width
    width = Math.min(width, maxWidth);
    height = Math.round(width / aspectRatio);

    return {
        ...element,
        size: { width, height },
    };
};
