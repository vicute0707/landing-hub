/**
 * Responsive Sync Utilities
 * Tự động sync size, position, styles giữa các view modes (desktop, tablet, mobile)
 */

/**
 * Tính scale factor giữa các view modes
 */
export const getScaleFactor = (fromMode, toMode) => {
    const widths = {
        desktop: 1200,
        tablet: 768,
        mobile: 375
    };
    return widths[toMode] / widths[fromMode];
};

/**
 * Tự động scale size cho element
 */
export const autoScaleSize = (element, fromMode, toMode) => {
    const scaleFactor = getScaleFactor(fromMode, toMode);

    // Section luôn full-width
    if (element.type === 'section') {
        return {
            width: toMode === 'mobile' ? 375 : toMode === 'tablet' ? 768 : 1200,
            height: element.size?.height || 400
        };
    }

    // Popup có width cố định
    if (element.type === 'popup' || element.type === 'modal') {
        return {
            width: toMode === 'mobile' ? 340 : toMode === 'tablet' ? 600 : element.size?.width || 600,
            height: element.size?.height || 400
        };
    }

    // Scale các element khác
    const baseWidth = element.size?.width || 200;
    const baseHeight = element.size?.height || 50;

    let scaledWidth = Math.round(baseWidth * scaleFactor);
    let scaledHeight = Math.round(baseHeight * scaleFactor);

    // Minimum sizes theo type
    const minSizes = {
        button: { width: 80, height: 32 },
        icon: { width: 24, height: 24 },
        image: { width: 100, height: 100 },
        heading: { width: 150, height: 24 },
        paragraph: { width: 200, height: 40 },
        gallery: { width: 300, height: 200 },
        default: { width: 100, height: 40 }
    };

    const minSize = minSizes[element.type] || minSizes.default;

    // Maximum width cho mobile
    if (toMode === 'mobile') {
        scaledWidth = Math.min(scaledWidth, 340); // Để có padding 2 bên
    }

    return {
        width: Math.max(scaledWidth, minSize.width),
        height: Math.max(scaledHeight, minSize.height)
    };
};

/**
 * Tự động scale position cho element
 */
export const autoScalePosition = (element, fromMode, toMode, newSize) => {
    const fromPos = element.position?.[fromMode] || { x: 0, y: 0, z: 1 };
    const scaleFactor = getScaleFactor(fromMode, toMode);

    // Section luôn x = 0
    if (element.type === 'section') {
        return {
            x: 0,
            y: fromPos.y,
            z: fromPos.z || 1
        };
    }

    // Popup center
    if (element.type === 'popup' || element.type === 'modal') {
        return {
            x: fromPos.x,
            y: fromPos.y,
            z: fromPos.z || 1001
        };
    }

    // Scale position
    let scaledX = Math.round(fromPos.x * scaleFactor);
    let scaledY = Math.round(fromPos.y * scaleFactor);

    // Đảm bảo không overflow
    const canvasWidth = toMode === 'mobile' ? 375 : toMode === 'tablet' ? 768 : 1200;
    const elementWidth = newSize?.width || element.size?.width || 200;

    if (scaledX + elementWidth > canvasWidth) {
        scaledX = Math.max(0, canvasWidth - elementWidth - 10);
    }

    return {
        x: Math.max(0, scaledX),
        y: Math.max(0, scaledY),
        z: fromPos.z || 1
    };
};

/**
 * Scale styles (font, padding, margin, etc.)
 */
export const autoScaleStyles = (styles, fromMode, toMode) => {
    if (!styles) return {};

    const scaleFactor = getScaleFactor(fromMode, toMode);
    const scaledStyles = { ...styles };

    // Properties cần scale
    const scalableProps = [
        'fontSize', 'padding', 'paddingTop', 'paddingBottom',
        'paddingLeft', 'paddingRight', 'margin', 'marginTop',
        'marginBottom', 'marginLeft', 'marginRight', 'borderRadius',
        'gap', 'borderWidth', 'strokeWidth', 'lineHeight'
    ];

    scalableProps.forEach(prop => {
        if (scaledStyles[prop]) {
            const value = scaledStyles[prop];

            // Parse number + unit
            if (typeof value === 'string') {
                const match = value.match(/^([\d.]+)(px|rem|em|%)$/);
                if (match) {
                    const num = parseFloat(match[1]);
                    const unit = match[2];

                    // Scale pixel values
                    if (unit === 'px') {
                        const scaled = Math.round(num * scaleFactor * 10) / 10;
                        // Minimum values
                        const min = prop.includes('font') ? 10 : 4;
                        scaledStyles[prop] = `${Math.max(scaled, min)}${unit}`;
                    }
                }
            } else if (typeof value === 'number') {
                const scaled = Math.round(value * scaleFactor);
                const min = prop.includes('font') ? 10 : 4;
                scaledStyles[prop] = Math.max(scaled, min);
            }
        }
    });

    // Scale compound values (padding: "10px 20px")
    if (scaledStyles.padding && typeof scaledStyles.padding === 'string' && scaledStyles.padding.includes(' ')) {
        const values = scaledStyles.padding.split(' ');
        const scaledValues = values.map(val => {
            const match = val.match(/^([\d.]+)(px|rem|em)$/);
            if (match) {
                const num = parseFloat(match[1]);
                const unit = match[2];
                const scaled = Math.round(num * scaleFactor * 10) / 10;
                return `${Math.max(scaled, 4)}${unit}`;
            }
            return val;
        });
        scaledStyles.padding = scaledValues.join(' ');
    }

    return scaledStyles;
};

/**
 * Scale componentData (columns, images grid, etc.)
 */
export const autoScaleComponentData = (componentData, toMode) => {
    if (!componentData) return {};

    const scaled = { ...componentData };

    if (toMode === 'mobile') {
        // Giảm columns cho mobile
        if (scaled.columns && scaled.columns > 2) {
            scaled.columns = 1;
        }

        // Grid template columns cho gallery
        if (scaled.images && scaled.images.length > 0) {
            scaled.gridTemplateColumns = 'repeat(2, 1fr)'; // Mobile: 2 columns
        }

        // Scale gap
        if (scaled.gap) {
            const match = scaled.gap.match(/^([\d.]+)(px|rem)$/);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = match[2];
                scaled.gap = `${Math.max(value * 0.5, 8)}${unit}`;
            }
        }
    } else if (toMode === 'tablet') {
        // Giảm columns cho tablet
        if (scaled.columns && scaled.columns > 3) {
            scaled.columns = 2;
        }

        if (scaled.images && scaled.images.length > 0) {
            scaled.gridTemplateColumns = 'repeat(3, 1fr)'; // Tablet: 3 columns
        }
    }

    return scaled;
};

/**
 * MAIN FUNCTION: Sync element giữa các view modes
 */
export const syncElementBetweenModes = (element, changedMode) => {
    const modes = ['desktop', 'tablet', 'mobile'];
    const updatedElement = { ...element };

    // Đảm bảo có position cho tất cả modes
    if (!updatedElement.position) {
        updatedElement.position = {
            desktop: { x: 0, y: 0, z: 1 },
            tablet: { x: 0, y: 0, z: 1 },
            mobile: { x: 0, y: 0, z: 1 }
        };
    }

    // Sync từ changedMode sang các modes khác
    modes.forEach(targetMode => {
        if (targetMode !== changedMode) {
            // Scale size
            const scaledSize = autoScaleSize(updatedElement, changedMode, targetMode);

            // Scale position
            const scaledPosition = autoScalePosition(updatedElement, changedMode, targetMode, scaledSize);

            // Update position
            updatedElement.position[targetMode] = scaledPosition;

            // Update size (chỉ cần 1 size object, không phân theo mode)
            if (targetMode === 'mobile') {
                updatedElement.mobileSize = scaledSize;
            } else if (targetMode === 'tablet') {
                updatedElement.tabletSize = scaledSize;
            }
        }
    });

    // Scale styles cho mobile
    if (!updatedElement.responsiveStyles) {
        updatedElement.responsiveStyles = {};
    }

    updatedElement.responsiveStyles.mobile = autoScaleStyles(
        updatedElement.styles,
        'desktop',
        'mobile'
    );

    updatedElement.responsiveStyles.tablet = autoScaleStyles(
        updatedElement.styles,
        'desktop',
        'tablet'
    );

    // Scale componentData
    updatedElement.mobileComponentData = autoScaleComponentData(
        updatedElement.componentData,
        'mobile'
    );

    updatedElement.tabletComponentData = autoScaleComponentData(
        updatedElement.componentData,
        'tablet'
    );

    // Sync children nếu có
    if (updatedElement.children && updatedElement.children.length > 0) {
        updatedElement.children = updatedElement.children.map(child =>
            syncElementBetweenModes(child, changedMode)
        );
    }

    return updatedElement;
};

/**
 * Sync toàn bộ pageData khi chuyển view mode
 */
export const syncAllElements = (pageData, currentMode) => {
    return {
        ...pageData,
        elements: pageData.elements.map(element =>
            syncElementBetweenModes(element, currentMode)
        )
    };
};

/**
 * Get responsive values dựa trên viewMode hiện tại
 */
export const getResponsiveValues = (element, viewMode) => {
    const baseSize = element.size || { width: element.type === 'section' ? 1200 : 200, height: 400 };
    const basePosition = element.position?.desktop || { x: 0, y: 0, z: 1 };
    const baseStyles = element.styles || {};
    const baseComponentData = element.componentData || {};

    let size = baseSize;
    let position = basePosition;
    let styles = baseStyles;
    let componentData = baseComponentData;

    switch (viewMode) {
        case 'tablet':
            size = element.tabletSize || baseSize;
            position = element.position?.tablet || basePosition;
            styles = element.responsiveStyles?.tablet
                ? { ...baseStyles, ...element.responsiveStyles.tablet }
                : baseStyles;
            componentData = element.tabletComponentData
                ? { ...baseComponentData, ...element.tabletComponentData }
                : baseComponentData;
            break;

        case 'mobile':
            size = element.mobileSize || element.tabletSize || baseSize;
            position = element.position?.mobile || basePosition;
            styles = element.responsiveStyles?.mobile
                ? { ...baseStyles, ...element.responsiveStyles.tablet, ...element.responsiveStyles.mobile }
                : baseStyles;
            componentData = element.mobileComponentData
                ? { ...baseComponentData, ...element.tabletComponentData, ...element.mobileComponentData }
                : baseComponentData;
            break;

        default:
            break;
    }

    return {
        id: element.id,
        type: element.type,
        size,
        position,
        styles,
        componentData,
        children: element.children || [],
        visible: element.visible !== false,
    };
};

/**
 * Initialize responsive data cho elements chưa có
 */
export const initializeResponsiveData = (pageData) => {
    return {
        ...pageData,
        elements: pageData.elements.map(element => {
            // Nếu chưa có responsive data, tạo mới
            if (!element.position?.mobile || !element.position?.tablet) {
                return syncElementBetweenModes(element, 'desktop');
            }
            return element;
        })
    };
};

/**
 * Batch update khi user thay đổi nhiều elements
 */
export const batchSyncElements = (elements, changedMode) => {
    return elements.map(element => syncElementBetweenModes(element, changedMode));
};

export default {
    getScaleFactor,
    autoScaleSize,
    autoScalePosition,
    autoScaleStyles,
    autoScaleComponentData,
    syncElementBetweenModes,
    syncAllElements,
    getResponsiveValues,
    initializeResponsiveData,
    batchSyncElements
};
