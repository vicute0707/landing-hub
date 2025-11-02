import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { sections } from '../../constants/sections';
import eventController from '../../utils/EventUtils';
import {
    CountdownRenderer,
    CarouselRenderer,
    AccordionRenderer,
    TabsRenderer,
    ProgressRenderer,
    RatingRenderer,
    SocialProofRenderer,
    SocialProofStatsRenderer
} from './advanced';

// Constants
/**
 * Item types for drag-and-drop functionality
 */
export const ItemTypes = {
    ELEMENT: 'element',
    EXISTING_ELEMENT: 'existingElement',
    CHILD_ELEMENT: 'childElement',
};

// Utilities
/**
 * Converts camelCase to kebab-case for CSS properties
 * @param {string} str - The camelCase string
 * @returns {string} The kebab-case string
 */
const toKebabCase = (str) =>
    str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/**
 * Calculates precise coordinates within a canvas or section
 * FIXED: Better handling of zoom, scroll, and negative positions
 * @param {number} mouseX - Mouse X coordinate
 * @param {number} mouseY - Mouse Y coordinate
 * @param {HTMLElement} containerElement - The container element
 * @param {number} zoomLevel - Zoom level percentage
 * @returns {Object} Coordinates { x, y }
 */
export const getCanvasPosition = (mouseX, mouseY, containerElement, zoomLevel = 100) => {
    if (!containerElement) {
        console.error('Container element is null in getCanvasPosition');
        return { x: 0, y: 0 };
    }

    const rect = containerElement.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // Calculate position relative to container, accounting for zoom and scroll
    const zoom = zoomLevel / 100;
    const rawX = ((mouseX - rect.left) / zoom);
    const rawY = ((mouseY - rect.top) / zoom);

    // Allow negative positions but round to avoid sub-pixel issues
    return {
        x: Math.round(rawX),
        y: Math.round(rawY)
    };
};


/**
 * Snaps coordinates to grid or nearby snap points
 * FREE MODE: Pass enableSnap = false for pixel-perfect free positioning
 * FIXED: Better snapping tolerance and grid handling
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} gridSize - Size of the grid
 * @param {Array<Object>} snapPoints - Array of snap points { x, y }
 * @param {boolean} enableSnap - Enable/disable snapping (default: true)
 * @returns {Object} Snapped or free coordinates { x, y }
 */
export const snapToGrid = (x, y, gridSize = 1, snapPoints = [], enableSnap = true) => {
    // Round to avoid sub-pixel issues
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);

    // Free positioning mode - return exact coordinates
    if (!enableSnap || gridSize <= 1) {
        return { x: roundedX, y: roundedY };
    }

    // Snap to grid
    let snappedX = Math.round(roundedX / gridSize) * gridSize;
    let snappedY = Math.round(roundedY / gridSize) * gridSize;

    // Snap to nearby points (guidelines) - with 10px tolerance
    const SNAP_TOLERANCE = 10;
    snapPoints.forEach((point) => {
        if (point && typeof point.x === 'number' && Math.abs(roundedX - point.x) < SNAP_TOLERANCE) {
            snappedX = point.x;
        }
        if (point && typeof point.y === 'number' && Math.abs(roundedY - point.y) < SNAP_TOLERANCE) {
            snappedY = point.y;
        }
    });

    return { x: Math.round(snappedX), y: Math.round(snappedY) };
};

/**
 * Calculates bounds of an element for snapping
 * @param {Object} element - Element object with position and size
 * @returns {Object} Bounds { left, top, right, bottom, centerX, centerY }
 */
export const getElementBounds = (element) => ({
    left: element.position?.desktop?.x || 0,
    top: element.position?.desktop?.y || 0,
    right: (element.position?.desktop?.x || 0) + (element.size?.width || 200),
    bottom: (element.position?.desktop?.y || 0) + (element.size?.height || 50),
    centerX: (element.position?.desktop?.x || 0) + (element.size?.width || 200) / 2,
    centerY: (element.position?.desktop?.y || 0) + (element.size?.height || 50) / 2,
});

/**
 * Processes styles including pseudo-classes and keyframes into CSS string
 * @param {Object} styles - Style object
 * @param {string} className - CSS class name
 * @returns {string} Generated CSS string
 */
export const processStyles = (styles, className) => {
    let cssString = '';
    const keyframes = {};

    Object.entries(styles).forEach(([key, value]) => {
        if (key.startsWith(':')) {
            cssString += `.${className}${key} { `;
            Object.entries(value).forEach(([prop, val]) => {
                if (prop.startsWith('::')) {
                    cssString += `.${className}${prop} { `;
                    Object.entries(val).forEach(([p, v]) => {
                        cssString += `${toKebabCase(p)}: ${v}; `;
                    });
                    cssString += '} ';
                } else {
                    cssString += `${toKebabCase(prop)}: ${val}; `;
                }
            });
            cssString += '} ';
        } else if (key.startsWith('@keyframes')) {
            keyframes[key] = value;
        } else {
            cssString += `${toKebabCase(key)}: ${value}; `;
        }
    });

    Object.entries(keyframes).forEach(([key, frames]) => {
        cssString += `${key} { `;
        Object.entries(frames).forEach(([percentage, props]) => {
            cssString += `${percentage} { `;
            Object.entries(props).forEach(([prop, val]) => {
                cssString += `${toKebabCase(prop)}: ${val}; `;
            });
            cssString += '} ';
        });
        cssString += '} ';
    });

    return cssString;
};

// Component Rendering
/**
 * Cleans styles for text-based elements by removing incompatible properties
 * @param {Object} originalStyles - Original style object
 * @returns {Object} Cleaned style object
 */
const getCleanTextStyles = (originalStyles) => {
    const cleaned = { ...originalStyles };
    const propertiesToRemove = [
        'border',
        'borderRadius',
        'boxShadow',
        'backgroundColor',
        'background',
        'backgroundImage',
        'backgroundSize',
        'backgroundPosition',
        'padding',
        'paddingLeft',
        'paddingRight',
        'paddingTop',
        'paddingBottom',
    ];

    propertiesToRemove.forEach((prop) => delete cleaned[prop]);

    return {
        ...cleaned,
        margin: cleaned.margin || '0',
        boxSizing: 'border-box',
        display: cleaned.display || 'block',
        width: cleaned.width || '100%',
        height: cleaned.height || 'auto',
    };
};

/**
 * Generates CSS for icon component with pseudo-classes and keyframes
 * @param {Object} styles - Style object
 * @param {string} uniqueClass - Unique CSS class name
 * @param {boolean} hasImage - Whether the icon uses an image
 * @returns {string} Generated CSS string
 */
const getIconCSS = (styles, uniqueClass, hasImage) => {
    let hoverCSS = '';
    let activeCSS = '';
    let keyframesCSS = '';

    const iconStyles = { ...styles };
    const hoverStyles = iconStyles[':hover'] || {};
    const activeStyles = iconStyles[':active'] || {};

    delete iconStyles[':hover'];
    delete iconStyles[':active'];

    Object.keys(iconStyles).forEach((key) => {
        if (key.startsWith('@keyframes')) {
            const animationName = key.replace('@keyframes ', '').trim();
            const frames = iconStyles[key];
            keyframesCSS += `@keyframes ${animationName} {`;
            Object.entries(frames).forEach(([percentage, props]) => {
                keyframesCSS += `${percentage} {`;
                Object.entries(props).forEach(([prop, val]) => {
                    keyframesCSS += `${toKebabCase(prop)}: ${val};`;
                });
                keyframesCSS += '}';
            });
            keyframesCSS += '}';
            delete iconStyles[key];
        }
    });

    if (Object.keys(hoverStyles).length > 0) {
        hoverCSS = `.${uniqueClass}:hover {`;
        Object.entries(hoverStyles).forEach(([key, value]) => {
            hoverCSS += `${toKebabCase(key)}: ${value};`;
        });
        hoverCSS += '}';
    }

    if (Object.keys(activeStyles).length > 0) {
        activeCSS = `.${uniqueClass}:active {`;
        Object.entries(activeStyles).forEach(([key, value]) => {
            activeCSS += `${toKebabCase(key)}: ${value};`;
        });
        activeCSS += '}';
    }

    const imgCSS = hasImage
        ? `
        .${uniqueClass} img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `
        : '';

    return `
    .${uniqueClass} {
      position: absolute;
      z-index: ${iconStyles.zIndex || 10};
      isolation: ${iconStyles.isolation || 'isolate'};
    }
    .${uniqueClass} svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: ${iconStyles.stroke || 'currentColor'};
      stroke-width: ${iconStyles.strokeWidth || 2};
      stroke-linecap: ${iconStyles.strokeLinecap || 'round'};
      stroke-linejoin: ${iconStyles.strokeLinejoin || 'round'};
    }
    ${imgCSS}
    ${hoverCSS}
    ${activeCSS}
    ${keyframesCSS}
  `;
};

/**
 * Generates CSS for button component with pseudo-classes and keyframes
 * @param {Object} styles - Style object
 * @param {string} buttonClass - Unique CSS class name
 * @returns {string} Generated CSS string
 */
const getButtonCSS = (styles, buttonClass) => {
    const buttonStyles = { ...styles };
    const pseudoStyles = {
        ':hover': buttonStyles[':hover'] || {},
        ':active': buttonStyles[':active'] || {},
    };
    const keyframes = {};

    delete buttonStyles[':hover'];
    delete buttonStyles[':active'];

    Object.keys(buttonStyles).forEach((key) => {
        if (key.startsWith('@keyframes')) {
            keyframes[key.replace('@keyframes ', '').trim()] = buttonStyles[key];
            delete buttonStyles[key];
        }
    });

    let cssString = Object.entries(pseudoStyles).reduce((acc, [pseudo, props]) => {
        if (Object.keys(props).length === 0) return acc;
        const propsString = Object.entries(props).map(([key, value]) => {
            if (key.startsWith('::')) {
                const subPropsString = Object.entries(value).map(([k, v]) => `${toKebabCase(k)}: ${v};`).join(' ');
                return `.${buttonClass}${key} { ${subPropsString} }`;
            }
            return `${toKebabCase(key)}: ${value};`;
        }).join(' ');
        return `${acc}.${buttonClass}${pseudo} { ${propsString} } `;
    }, '');

    cssString += Object.entries(keyframes).reduce((acc, [name, frames]) => {
        const framesString = Object.entries(frames).map(([frame, props]) => {
            const propsString = Object.entries(props).map(([key, value]) => `${toKebabCase(key)}: ${value};`).join(' ');
            return `${frame} { ${propsString} }`;
        }).join(' ');
        return `${acc} @keyframes ${name} { ${framesString} }`;
    }, '');

    return cssString;
};

/**
 * Generates CSS for gallery animations
 * @param {Object} animation - Animation configuration
 * @param {string} galleryClass - Unique CSS class name
 * @returns {string} Generated CSS string
 */
const getGalleryAnimationCSS = (animation, galleryClass) => {
    if (!animation?.type) return '';

    const animationName = `${animation.type}-${galleryClass}`;
    const animationCSS = `
    @keyframes ${animationName} {
      ${animation.type === 'fadeIn' ? `
        from { opacity: 0; }
        to { opacity: 1; }
      ` : animation.type === 'fadeInUp' ? `
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      ` : animation.type === 'slideInRight' ? `
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      ` : animation.type === 'bounceIn' ? `
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.05); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); }
      ` : ''}
    }
    .${galleryClass} {
      animation: ${animationName} ${animation.duration || 800}ms ease-out ${animation.delay || 0}ms;
    }
  `;

    return animationCSS;
};

/**
 * Renders content for different component types
 * @param {string} type - Component type
 * @param {Object} componentData - Component data
 * @param {Object} styles - Style object
 * @param {Array} children - Child components
 * @param {boolean} isCanvas - Whether in canvas mode
 * @param {Function} onSelectChild - Child selection callback
 * @param {string} parentId - Parent element ID
 * @param {string} childId - Child element ID
 * @param {boolean} isTemplateMode - Whether in template mode
 * @param {string} viewMode - Current view mode (desktop/tablet/mobile)
 * @returns {JSX.Element} Rendered component
 */
export const renderComponentContent = (
    type,
    componentData = {},
    styles = {},
    children = [],
    isCanvas = false,
    onSelectChild = null,
    parentId = null,
    childId = null,
    isTemplateMode = false,
    viewMode = 'desktop'
) => {
    // Validation
    if (!type || typeof type !== 'string') {
        return (
            <div
                style={{
                    color: componentData.errorColor || '#ff0000',
                    padding: '10px',
                    border: '1px dashed #ff0000',
                    borderRadius: '4px',
                    ...styles,
                }}
            >
                Unknown Component: {type || 'Không xác định'}
            </div>
        );
    }

    // Determine if component should use absolute positioning
    // Only use absolute for positioned elements that need it
    const absolutePositionTypes = ['icon', 'square', 'star'];
    const shouldUseAbsolutePosition = absolutePositionTypes.includes(type.toLowerCase());

    // Base styles with proper position handling
    // Preserve existing position if set, otherwise use appropriate default
    const baseStyles = {
        ...styles,
        position: styles.position || (shouldUseAbsolutePosition ? 'absolute' : undefined),
    };

    // Section rendering - This is used by Element.js wrapper, so keep it simple
    if (type === 'section' && componentData.structure === 'ladi-standard') {
        return (
            <div className="ladi-section" style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'visible',
            }}>
                {/* Background and overlay are handled by Element.js wrapper */}
                <div
                    className="ladi-container"
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        width: '100%',
                        height: '100%',
                    }}
                >
                    {children.map((child, index) => {
                        // Get responsive values for child
                        const childPosition = child.position?.[viewMode] || child.position?.desktop || { x: 0, y: 0 };
                        const childSize = viewMode === 'mobile' && child.mobileSize
                            ? child.mobileSize
                            : viewMode === 'tablet' && child.tabletSize
                                ? child.tabletSize
                                : child.size || {};

                        // Determine if child should use absolute positioning
                        const childNeedsAbsolute = child.styles?.position === 'absolute' ||
                            ['icon', 'square', 'star'].includes(child.type?.toLowerCase());

                        // Merge child styles with position
                        const childStyles = {
                            ...child.styles,
                            position: childNeedsAbsolute ? 'absolute' : (child.styles?.position || 'absolute'), // Children in sections are absolute by default
                            left: childPosition.x !== undefined ? `${childPosition.x}px` : undefined,
                            top: childPosition.y !== undefined ? `${childPosition.y}px` : undefined,
                            width: childSize.width ? `${childSize.width}px` : child.styles?.width,
                            height: childSize.height ? `${childSize.height}px` : child.styles?.height,
                            zIndex: childPosition.z || child.styles?.zIndex || 1,
                        };

                        return React.cloneElement(
                            renderComponentContent(
                                child.type,
                                child.componentData || {},
                                childStyles,
                                child.children || [],
                                isCanvas,
                                onSelectChild,
                                parentId,
                                child.id,
                                isTemplateMode,
                                viewMode
                            ),
                            { key: child.id || index }
                        );
                    })}
                </div>
            </div>
        );
    }

    // Component-specific rendering
    switch (type.toLowerCase()) {
        case 'square': {
            const { events = {} } = componentData;
            const handleClick = (e) => {
                e.stopPropagation();
                if (isCanvas && typeof onSelectChild === 'function' && parentId && childId) {
                    onSelectChild(parentId, childId);
                }
                if (events.onClick) {
                    eventController.handleEvent(events.onClick, childId || parentId, isCanvas);
                }
            };

            return (
                <svg
                    width={baseStyles.width || componentData.size?.width || 50}
                    height={baseStyles.height || componentData.size?.height || 50}
                    style={baseStyles}
                    onClick={handleClick}
                >
                    <rect
                        x="0"
                        y="0"
                        width={baseStyles.width || componentData.size?.width || 50}
                        height={baseStyles.height || componentData.size?.height || 50}
                        fill={baseStyles.fill || componentData.fill || '#000'}
                        stroke={baseStyles.stroke || componentData.stroke || 'currentColor'}
                        strokeWidth={baseStyles.strokeWidth || componentData.strokeWidth || 2}
                        strokeLinecap={baseStyles.strokeLinecap || componentData.strokeLinecap || 'round'}
                        strokeLinejoin={baseStyles.strokeLinejoin || componentData.strokeLinejoin || 'round'}
                    />
                </svg>
            );
        }

        case 'star': {
            const { events = {} } = componentData;
            const handleClick = (e) => {
                e.stopPropagation();
                if (isCanvas && typeof onSelectChild === 'function' && parentId && childId) {
                    onSelectChild(parentId, childId);
                }
                if (events.onClick) {
                    eventController.handleEvent(events.onClick, childId || parentId, isCanvas);
                }
            };

            return (
                <svg
                    width={baseStyles.width || componentData.size?.width || 50}
                    height={baseStyles.height || componentData.size?.height || 50}
                    style={baseStyles}
                    onClick={handleClick}
                >
                    <path
                        d="M25 5 L32 18 H48 L36 29 L41 44 L25 36 L9 44 L14 29 L2 18 H18 Z"
                        fill={baseStyles.fill || componentData.fill || '#000'}
                        stroke={baseStyles.stroke || componentData.stroke || 'currentColor'}
                        strokeWidth={baseStyles.strokeWidth || componentData.strokeWidth || 2}
                        strokeLinecap={baseStyles.strokeLinecap || componentData.strokeLinecap || 'round'}
                        strokeLinejoin={baseStyles.strokeLinejoin || componentData.strokeLinejoin || 'round'}
                    />
                </svg>
            );
        }

        case 'layoutgrid': {
            return (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: componentData.columns
                            ? `repeat(${componentData.columns}, 1fr)`
                            : baseStyles.gridTemplateColumns || 'repeat(2, 1fr)',
                        gap: componentData.gap || baseStyles.gap || '20px',
                        padding: componentData.padding || baseStyles.padding || '10px',
                        background: componentData.background || baseStyles.background || 'transparent',
                        ...baseStyles,
                    }}
                >
                    {children.map((child, index) =>
                        React.cloneElement(
                            renderComponentContent(
                                child.type,
                                child.componentData || {},
                                child.styles || {},
                                child.children || [],
                                isCanvas,
                                onSelectChild,
                                parentId,
                                child.id,
                                isTemplateMode,
                                viewMode
                            ),
                            { key: child.id || index }
                        )
                    )}
                </div>
            );
        }

        case 'icon': {
            const { icon, events = {}, title, imageUrl } = componentData;
            const uniqueClass = `icon-${parentId || 'root'}-${childId || Date.now()}`;
            const isSvg = icon && icon.startsWith('<svg');

            const handleClick = (e) => {
                e.stopPropagation();
                if (isCanvas && typeof onSelectChild === 'function' && parentId && childId) {
                    onSelectChild(parentId, childId);
                }
                if (events.onClick) {
                    eventController.handleEvent(events.onClick, childId || parentId, isCanvas);
                }
            };

            const iconStyles = {
                ...baseStyles,
                width: componentData.size?.width || baseStyles.width || '50px',
                height: componentData.size?.height || baseStyles.height || '50px',
                display: baseStyles.display || 'flex',
                alignItems: baseStyles.alignItems || 'center',
                justifyContent: baseStyles.justifyContent || 'center',
                cursor: events.onClick ? 'pointer' : 'default',
            };

            const cssString = getIconCSS(styles, uniqueClass, !!imageUrl);

            return (
                <>
                    {cssString && <style>{cssString}</style>}
                    <div className={`lpb-icon ${uniqueClass}`} style={iconStyles} onClick={handleClick} title={title || ''}>
                        {imageUrl ? (
                            <img src={imageUrl} alt={title || 'Icon'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : isSvg ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: icon }}
                                style={{
                                    width: componentData.size?.width || baseStyles.width || '50px',
                                    height: componentData.size?.height || baseStyles.height || '50px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            />
                        ) : (
                            icon && <i className={icon} style={{ fontSize: 'inherit', color: 'inherit' }} />
                        )}
                    </div>
                </>
            );
        }

        case 'heading': {
            const headingLevel = componentData.level && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(componentData.level)
                ? componentData.level
                : 'h2';
            const HeadingTag = headingLevel;
            return (
                <HeadingTag
                    style={{
                        ...getCleanTextStyles(baseStyles),
                        position: baseStyles.position || 'relative',  // ✅ Preserve position
                        fontSize: baseStyles.fontSize || componentData.fontSize || '1.5rem',
                        color: baseStyles.color || componentData.color || '#1f2937',
                        margin: baseStyles.margin || componentData.margin || '0',
                        fontWeight: baseStyles.fontWeight || componentData.fontWeight || '700',
                        textAlign: baseStyles.textAlign || componentData.textAlign || 'left',
                        lineHeight: baseStyles.lineHeight || componentData.lineHeight || '1.4',
                        fontFamily: baseStyles.fontFamily || componentData.fontFamily || 'Arial, sans-serif',
                        fontStyle: baseStyles.fontStyle || componentData.fontStyle || 'normal',
                        textDecoration: baseStyles.textDecoration || componentData.textDecoration || 'none',
                        textTransform: baseStyles.textTransform || componentData.textTransform || 'none',
                        letterSpacing: baseStyles.letterSpacing || componentData.letterSpacing || '0',
                        textShadow: baseStyles.textShadow || componentData.textShadow || 'none',
                        WebkitTextStroke: baseStyles.WebkitTextStroke || componentData.WebkitTextStroke || 'none',
                        WebkitBackgroundClip: baseStyles.WebkitBackgroundClip || componentData.WebkitBackgroundClip || 'initial',
                        WebkitTextFillColor: baseStyles.WebkitTextFillColor || componentData.WebkitTextFillColor || 'initial',
                        zIndex: baseStyles.zIndex || 100,  // ✅ Cao hơn background
                        pointerEvents: 'auto',  // ✅ CHO PHÉP CLICK
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isCanvas && typeof onSelectChild === 'function' && parentId && childId) {
                            onSelectChild(parentId, childId);
                        }
                    }}
                >
                    {componentData.content || 'Tiêu đề'}
                </HeadingTag>
            );
        }

        case 'paragraph': {
            return (
                <p
                    style={{
                        ...getCleanTextStyles(baseStyles),
                        position: baseStyles.position || 'relative',  // ✅ Preserve position
                        fontSize: componentData.fontSize || '1rem',
                        color: componentData.color || '#1f2937',
                        margin: componentData.margin || '0',
                        fontWeight: componentData.fontWeight || '400',
                        lineHeight: componentData.lineHeight || '1.6',
                        textAlign: componentData.textAlign || 'left',
                        zIndex: baseStyles.zIndex || 100,  // ✅ Cao hơn background
                        pointerEvents: 'auto',  // ✅ CHO PHÉP CLICK
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isCanvas && typeof onSelectChild === 'function' && parentId && childId) {
                            onSelectChild(parentId, childId);
                        }
                    }}
                >
                    {componentData.content || 'Đoạn văn'}
                </p>
            );
        }

        case 'button': {
            const buttonClass = `button-${componentData.id || Math.random().toString(36).substr(2, 9)}`;
            const cssString = getButtonCSS(styles, buttonClass);

            const handleClick = (e) => {
                e.stopPropagation();
                if (isCanvas && typeof onSelectChild === 'function' && parentId && childId) {
                    onSelectChild(parentId, childId);
                }
                if (componentData.events?.onClick) {
                    eventController.handleEvent(componentData.events.onClick, childId || parentId, isCanvas);
                    const event = componentData.events.onClick;
                    if (isCanvas) {
                        if (event.type === 'submitForm') {
                            toast.info(`Mô phỏng: Gửi form đến ${event.apiUrl}`, {
                                position: 'bottom-right',
                                autoClose: 2000,
                            });
                        } else if (event.type === 'navigate') {
                            toast.info(`Mô phỏng: Điều hướng đến ${event.url}`, {
                                position: 'bottom-right',
                                autoClose: 2000,
                            });
                        } else if (event.type === 'triggerApi') {
                            toast.info(`Mô phỏng: Gọi API ${event.apiUrl}`, {
                                position: 'bottom-right',
                                autoClose: 2000,
                            });
                        }
                    } else {
                        if (event.type === 'submitForm') {
                            console.log(`Submitting form to ${event.apiUrl}`);
                        } else if (event.type === 'navigate') {
                            window.location.href = event.url;
                        } else if (event.type === 'triggerApi') {
                            console.log(`Trigger API: ${event.apiUrl}`);
                        }
                    }
                }
            };

            return (
                <>
                    {cssString && <style>{cssString}</style>}
                    <button
                        className={buttonClass}
                        style={{
                            ...baseStyles,
                            position: baseStyles.position || 'relative',  // ✅ Preserve position
                            padding: baseStyles.padding || componentData.padding || '10px 20px',
                            borderRadius: baseStyles.borderRadius || componentData.borderRadius || '8px',
                            background: baseStyles.background || componentData.background || '#2563eb',
                            color: baseStyles.color || componentData.color || '#fff',
                            border: baseStyles.border || componentData.border || 'none',
                            cursor: baseStyles.cursor || 'pointer',
                            fontSize: baseStyles.fontSize || componentData.fontSize || '1rem',
                            fontWeight: baseStyles.fontWeight || componentData.fontWeight || '600',
                            textAlign: baseStyles.textAlign || componentData.textAlign || 'center',
                            display: baseStyles.display || 'inline-flex',
                            alignItems: baseStyles.alignItems || 'center',
                            justifyContent: baseStyles.justifyContent || 'center',
                            transition: baseStyles.transition || 'all 0.3s ease',
                            boxSizing: 'border-box',
                            width: baseStyles.width || 'auto',
                            minWidth: baseStyles.minWidth || 'fit-content',
                            whiteSpace: 'nowrap',
                            zIndex: baseStyles.zIndex || 100,  // ✅ Cao hơn background
                            pointerEvents: 'auto',  // ✅ CHO PHÉP CLICK
                        }}
                        onClick={handleClick}
                    >
                        {componentData.content || 'Nút'}
                    </button>
                </>
            );
        }

        case 'image': {
            return (
                <img
                    src={componentData.src || 'https://via.placeholder.com/150?text=Image'}
                    alt={componentData.alt || 'Hình ảnh'}
                    style={{
                        maxWidth: componentData.maxWidth || '100%',
                        height: componentData.height || 'auto',
                        borderRadius: componentData.borderRadius || '0',
                        ...baseStyles,
                    }}
                    draggable={componentData.draggable ?? false}
                />
            );
        }

        case 'iframe': {
            return (
                <iframe
                    src={componentData.src || ''}
                    title={componentData.title || 'Iframe'}
                    width={componentData.width || '100%'}
                    height={componentData.height || '100%'}
                    frameBorder={componentData.frameBorder ?? 0}
                    allow={componentData.allow || 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'}
                    allowFullScreen={componentData.allowFullscreen ?? true}
                    loading={componentData.loading || 'lazy'}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        ...baseStyles,
                    }}
                />
            );
        }

        case 'form': {
            const fields = componentData.fields || [];
            const showLabels = componentData.showLabels !== false;
            const labelPosition = componentData.labelPosition || 'top';

            return (
                <form
                    id={parentId}
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (isCanvas) {
                            // In canvas mode, don't actually submit
                            return false;
                        }
                    }}
                    style={{
                        display: 'flex',
                        flexDirection: componentData.direction || 'column',
                        gap: componentData.gap || '16px',
                        width: '100%',
                        ...baseStyles,
                    }}
                >
                    {componentData.title && (
                        <h3
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                margin: componentData.titleMargin || '0 0 8px 0',
                                fontSize: componentData.titleFontSize || '24px',
                                color: componentData.titleColor || '#1f2937',
                                fontWeight: componentData.titleFontWeight || '600',
                            }}
                        >
                            {componentData.title}
                        </h3>
                    )}

                    {fields.map((field, index) => {
                        const fieldId = `${parentId}-${field.name || `field-${index}`}`;

                        return (
                            <div key={index} style={{ marginBottom: componentData.gap || '16px' }}>
                                {/* Label */}
                                {showLabels && labelPosition === 'top' && field.label && (
                                    <label
                                        htmlFor={fieldId}
                                        style={{
                                            display: 'block',
                                            marginBottom: '8px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#374151',
                                        }}
                                    >
                                        {field.label}
                                        {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                                    </label>
                                )}

                                {/* Field Input */}
                                {field.type === 'textarea' ? (
                                    <textarea
                                        id={fieldId}
                                        name={field.name}
                                        placeholder={field.placeholder || ''}
                                        required={field.required || false}
                                        rows={field.rows || 4}
                                        disabled={isCanvas}
                                        style={{
                                            width: '100%',
                                            padding: field.padding || '12px',
                                            borderRadius: field.borderRadius || '8px',
                                            border: field.border || '1px solid #e5e7eb',
                                            fontSize: field.fontSize || '14px',
                                            fontFamily: 'inherit',
                                            resize: 'vertical',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        id={fieldId}
                                        name={field.name}
                                        required={field.required || false}
                                        disabled={isCanvas}
                                        style={{
                                            width: '100%',
                                            padding: field.padding || '12px',
                                            borderRadius: field.borderRadius || '8px',
                                            border: field.border || '1px solid #e5e7eb',
                                            fontSize: field.fontSize || '14px',
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <option value="">Chọn...</option>
                                        {(field.options || []).map((option, i) => (
                                            <option key={i} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                ) : field.type === 'checkbox' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id={fieldId}
                                            name={field.name}
                                            required={field.required || false}
                                            disabled={isCanvas}
                                            style={{
                                                width: '18px',
                                                height: '18px',
                                                cursor: isCanvas ? 'default' : 'pointer',
                                            }}
                                        />
                                        <label
                                            htmlFor={fieldId}
                                            style={{
                                                fontSize: field.fontSize || '14px',
                                                color: '#374151',
                                                cursor: isCanvas ? 'default' : 'pointer',
                                            }}
                                        >
                                            {field.label || field.placeholder}
                                        </label>
                                    </div>
                                ) : field.type === 'radio' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {(field.options || []).map((option, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="radio"
                                                    id={`${fieldId}-${i}`}
                                                    name={field.name}
                                                    value={option}
                                                    required={field.required && i === 0}
                                                    disabled={isCanvas}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: isCanvas ? 'default' : 'pointer',
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`${fieldId}-${i}`}
                                                    style={{
                                                        fontSize: field.fontSize || '14px',
                                                        color: '#374151',
                                                        cursor: isCanvas ? 'default' : 'pointer',
                                                    }}
                                                >
                                                    {option}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        type={field.type || 'text'}
                                        id={fieldId}
                                        name={field.name}
                                        placeholder={field.placeholder || ''}
                                        required={field.required || false}
                                        disabled={isCanvas}
                                        style={{
                                            width: '100%',
                                            padding: field.padding || '12px',
                                            borderRadius: field.borderRadius || '8px',
                                            border: field.border || '1px solid #e5e7eb',
                                            fontSize: field.fontSize || '14px',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isCanvas}
                        style={{
                            background: componentData.buttonBackground || '#667eea',
                            color: componentData.buttonColor || '#ffffff',
                            padding: componentData.buttonPadding || '12px 32px',
                            borderRadius: componentData.buttonBorderRadius || '8px',
                            border: componentData.buttonBorder || 'none',
                            cursor: isCanvas ? 'default' : 'pointer',
                            fontSize: componentData.buttonFontSize || '16px',
                            fontWeight: componentData.buttonFontWeight || '600',
                            transition: 'all 0.2s',
                            alignSelf: componentData.direction === 'row' ? 'flex-start' : 'stretch',
                        }}
                    >
                        {componentData.buttonText || 'Gửi ngay'}
                    </button>

                    {/* Render children if any */}
                    {children.map((child, index) =>
                        React.cloneElement(
                            renderComponentContent(
                                child.type,
                                child.componentData || {},
                                child.styles || {},
                                child.children || [],
                                isCanvas,
                                onSelectChild,
                                parentId,
                                child.id,
                                isTemplateMode,
                                viewMode
                            ),
                            { key: child.id || index }
                        )
                    )}
                </form>
            );
        }

        case 'section':
        case 'container': {
            return (
                <div
                    style={{
                        display: componentData.layoutType || 'flex',
                        flexDirection: componentData.direction || 'column',
                        gap: componentData.gap || '10px',
                        padding: componentData.padding || '0',
                        background: componentData.background || 'transparent',
                        ...baseStyles,
                    }}
                >
                    {componentData.title && !children.some((child) => child?.type === 'heading') && (
                        <h2
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.titleFontSize || '1.8rem',
                                margin: componentData.titleMargin || '0',
                                color: componentData.titleColor || '#1f2937',
                                fontWeight: componentData.titleFontWeight || '700',
                            }}
                        >
                            {componentData.title}
                        </h2>
                    )}
                    {componentData.subtitle && !children.some((child) => child?.type === 'paragraph') && (
                        <p
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.subtitleFontSize || '1.2rem',
                                margin: componentData.subtitleMargin || '0',
                                color: componentData.subtitleColor || '#4b5563',
                            }}
                        >
                            {componentData.subtitle}
                        </p>
                    )}
                    {componentData.content && !children.some((child) => child?.type === 'paragraph') && (
                        <p
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.contentFontSize || '1rem',
                                margin: componentData.contentMargin || '0',
                                color: componentData.contentColor || '#4b5563',
                            }}
                        >
                            {componentData.content}
                        </p>
                    )}
                    {Array.isArray(componentData.features) && componentData.features.length > 0 && !children.some((child) => child?.type === 'list') && (
                        <ul
                            style={{
                                listStyle: 'none',
                                padding: componentData.featuresPadding || 0,
                                margin: componentData.featuresMargin || '0',
                                display: 'flex',
                                flexDirection: componentData.featuresDirection || 'column',
                                gap: componentData.featuresGap || '8px',
                            }}
                        >
                            {componentData.features.map((feature, index) => (
                                <li
                                    key={index}
                                    style={{
                                        fontSize: componentData.featureFontSize || '1rem',
                                        color: componentData.featureColor || '#1f2937',
                                    }}
                                >
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    )}
                    {componentData.ctaText && !children.some((child) => child?.type === 'button') && (
                        <button
                            style={{
                                padding: componentData.ctaPadding || '10px 20px',
                                borderRadius: componentData.ctaBorderRadius || '8px',
                                background: componentData.ctaBackground || '#2563eb',
                                color: componentData.ctaColor || '#fff',
                                border: componentData.ctaBorder || 'none',
                                cursor: 'pointer',
                                fontSize: componentData.ctaFontSize || '1rem',
                                fontWeight: componentData.ctaFontWeight || '600',
                            }}
                        >
                            {componentData.ctaText}
                        </button>
                    )}
                    {componentData.contact && !children.some((child) => child?.type === 'paragraph') && (
                        <p
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.contactFontSize || '0.9rem',
                                margin: componentData.contactMargin || '0',
                                color: componentData.contactColor || '#4b5563',
                            }}
                        >
                            {componentData.contact}
                        </p>
                    )}
                    {children.map((child, index) =>
                        React.cloneElement(
                            renderComponentContent(
                                child.type,
                                child.componentData || {},
                                child.styles || {},
                                child.children || [],
                                isCanvas,
                                onSelectChild,
                                parentId,
                                child.id,
                                isTemplateMode,
                                viewMode
                            ),
                            { key: child.id || index }
                        )
                    )}
                </div>
            );
        }

        case 'divider': {
            return (
                <hr
                    style={{
                        border: 'none',
                        background: componentData.color || '#e5e7eb',
                        height: componentData.thickness || '2px',
                        width: componentData.width || '100%',
                        margin: componentData.margin || '0',
                        ...baseStyles,
                    }}
                />
            );
        }

        case 'spacer': {
            return (
                <div
                    style={{
                        background: componentData.background || 'transparent',
                        height: componentData.height || '40px',
                        width: componentData.width || '100%',
                        ...baseStyles,
                    }}
                />
            );
        }

        case 'popup': {
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: componentData.direction || 'column',
                        gap: componentData.gap || '10px',
                        textAlign: componentData.textAlign || 'center',
                        padding: componentData.padding || '20px',
                        background: componentData.background || 'rgba(255, 255, 255, 0.9)',
                        borderRadius: componentData.borderRadius || '12px',
                        ...baseStyles,
                    }}
                >
                    {componentData.title && !children.some((child) => child?.type === 'heading') && (
                        <h3
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.titleFontSize || '1.5rem',
                                margin: componentData.titleMargin || '0',
                                color: componentData.titleColor || '#1f2937',
                                fontWeight: componentData.titleFontWeight || '600',
                            }}
                        >
                            {componentData.title}
                        </h3>
                    )}
                    {componentData.content && !children.some((child) => child?.type === 'paragraph') && (
                        <p
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.contentFontSize || '1rem',
                                margin: componentData.contentMargin || '0',
                                color: componentData.contentColor || '#4b5563',
                            }}
                        >
                            {componentData.content}
                        </p>
                    )}
                    {componentData.buttonText && !children.some((child) => child?.type === 'button') && (
                        <button
                            style={{
                                padding: componentData.buttonPadding || '10px 20px',
                                borderRadius: componentData.buttonBorderRadius || '8px',
                                background: componentData.buttonBackground || '#2563eb',
                                color: componentData.buttonColor || '#fff',
                                border: componentData.buttonBorder || 'none',
                                cursor: 'pointer',
                                fontSize: componentData.buttonFontSize || '1rem',
                                fontWeight: componentData.buttonFontWeight || '600',
                            }}
                        >
                            {componentData.buttonText}
                        </button>
                    )}
                    {children.map((child, index) =>
                        React.cloneElement(
                            renderComponentContent(
                                child.type,
                                child.componentData || {},
                                child.styles || {},
                                child.children || [],
                                isCanvas,
                                onSelectChild,
                                parentId,
                                child.id,
                                isTemplateMode,
                                viewMode
                            ),
                            { key: child.id || index }
                        )
                    )}
                </div>
            );
        }

        case 'modal': {
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: componentData.direction || 'column',
                        gap: componentData.gap || '10px',
                        padding: componentData.padding || '20px',
                        background: componentData.background || 'rgba(255, 255, 255, 0.9)',
                        borderRadius: componentData.borderRadius || '12px',
                        ...baseStyles,
                    }}
                >
                    {componentData.title && !children.some((child) => child?.type === 'heading') && (
                        <h3
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.titleFontSize || '1.5rem',
                                margin: componentData.titleMargin || '0',
                                color: componentData.titleColor || '#1f2937',
                                fontWeight: componentData.titleFontWeight || '600',
                            }}
                        >
                            {componentData.title}
                        </h3>
                    )}
                    {componentData.content && !children.some((child) => child?.type === 'paragraph') && (
                        <p
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.contentFontSize || '1rem',
                                margin: componentData.contentMargin || '0',
                                color: componentData.contentColor || '#4b5563',
                            }}
                        >
                            {componentData.content}
                        </p>
                    )}
                    {componentData.closeButton && !children.some((child) => child?.type === 'button') && (
                        <button
                            style={{
                                padding: componentData.buttonPadding || '8px 16px',
                                borderRadius: componentData.buttonBorderRadius || '8px',
                                background: componentData.buttonBackground || '#6b7280',
                                color: componentData.buttonColor || '#fff',
                                border: componentData.buttonBorder || 'none',
                                cursor: 'pointer',
                                alignSelf: 'flex-end',
                                fontSize: componentData.buttonFontSize || '1rem',
                                fontWeight: componentData.buttonFontWeight || '600',
                            }}
                        >
                            {componentData.buttonText || 'Đóng'}
                        </button>
                    )}
                    {children.map((child, index) =>
                        React.cloneElement(
                            renderComponentContent(
                                child.type,
                                child.componentData || {},
                                child.styles || {},
                                child.children || [],
                                isCanvas,
                                onSelectChild,
                                parentId,
                                child.id,
                                isTemplateMode,
                                viewMode
                            ),
                            { key: child.id || index }
                        )
                    )}
                </div>
            );
        }

        case 'card': {
            return (
                <div
                    style={{
                        padding: componentData.padding || '20px',
                        background: componentData.background || '#ffffff',
                        borderRadius: componentData.borderRadius || '8px',
                        boxShadow: componentData.boxShadow || '0 2px 8px rgba(0,0,0,0.1)',
                        ...baseStyles,
                    }}
                >
                    {componentData.title && (
                        <h3
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.titleFontSize || '1.2rem',
                                margin: componentData.titleMargin || '0',
                                color: componentData.titleColor || '#1f2937',
                            }}
                        >
                            {componentData.title}
                        </h3>
                    )}
                    {componentData.content && (
                        <p
                            style={{
                                ...getCleanTextStyles(baseStyles),
                                fontSize: componentData.contentFontSize || '1rem',
                                margin: componentData.contentMargin || '10px 0 0',
                                color: componentData.contentColor || '#4b5563',
                            }}
                        >
                            {componentData.content}
                        </p>
                    )}
                </div>
            );
        }

        case 'grid': {
            return (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: componentData.columns ? `repeat(${componentData.columns}, 1fr)` : 'repeat(2, 1fr)',
                        gap: componentData.gap || '20px',
                        ...baseStyles,
                    }}
                >
                    {Array.isArray(componentData.items) &&
                        componentData.items.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: componentData.itemBackground || '#ffffff',
                                    borderRadius: componentData.itemBorderRadius || '8px',
                                    padding: componentData.itemPadding || '10px',
                                }}
                            >
                                {item.image && (
                                    <img
                                        src={item.image}
                                        alt={item.title || 'Product'}
                                        style={{ maxWidth: '100%', height: 'auto' }}
                                    />
                                )}
                                {item.title && (
                                    <h4
                                        style={{
                                            ...getCleanTextStyles(baseStyles),
                                            fontSize: componentData.titleFontSize || '1rem',
                                            margin: componentData.titleMargin || '10px 0 0',
                                            color: componentData.titleColor || '#1f2937',
                                        }}
                                    >
                                        {item.title}
                                    </h4>
                                )}
                                {item.price && (
                                    <p
                                        style={{
                                            ...getCleanTextStyles(baseStyles),
                                            fontSize: componentData.priceFontSize || '0.9rem',
                                            margin: componentData.priceMargin || '5px 0 0',
                                            color: componentData.priceColor || '#4b5563',
                                        }}
                                    >
                                        {item.price}
                                    </p>
                                )}
                            </div>
                        ))}
                </div>
            );
        }

        case 'list': {
            return (
                <ul
                    style={{
                        listStyleType: componentData.listStyleType || 'none',
                        padding: componentData.padding || '0',
                        ...baseStyles,
                    }}
                >
                    {Array.isArray(componentData.items) &&
                        componentData.items.map((item, index) => (
                            <li
                                key={index}
                                style={{
                                    ...getCleanTextStyles(baseStyles),
                                    fontSize: componentData.itemFontSize || '1rem',
                                    margin: componentData.itemMargin || '5px 0',
                                    color: componentData.itemColor || '#1f2937',
                                }}
                            >
                                {item.title || item}
                            </li>
                        ))}
                </ul>
            );
        }

        case 'gallery': {
            const { images = [], animation = {} } = componentData;
            const galleryClass = `gallery-${parentId || 'root'}-${childId || Date.now()}`;
            const animationCSS = getGalleryAnimationCSS(animation, galleryClass);

            const handleImageClick = (e, imageUrl, index) => {
                e.stopPropagation();
                if (isCanvas) {
                    if (typeof onSelectChild === 'function' && parentId && childId) {
                        onSelectChild(parentId, childId);
                    }
                    toast.info(`Mô phỏng: Mở lightbox cho ảnh ${index + 1}`, {
                        position: 'bottom-right',
                        autoClose: 2000,
                    });
                } else {
                    console.log(`Open image: ${imageUrl}`);
                }
            };

            return (
                <>
                    {animationCSS && <style>{animationCSS}</style>}
                    <div
                        className={`lpb-gallery ${galleryClass}`}
                        style={{
                            ...baseStyles,
                            cursor: componentData.events?.onClick ? 'pointer' : 'default',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isCanvas && typeof onSelectChild === 'function' && parentId && childId) {
                                onSelectChild(parentId, childId);
                            }
                        }}
                    >
                        <div
                            style={{
                                display: baseStyles.display || 'grid',
                                gridTemplateColumns: baseStyles.gridTemplateColumns || 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: baseStyles.gap || '10px',
                                width: '100%',
                            }}
                        >
                            {images.map((imageUrl, index) => (
                                <div
                                    key={index}
                                    style={{
                                        position: 'relative',
                                        overflow: 'hidden',
                                        borderRadius: baseStyles.borderRadius || '8px',
                                        aspectRatio: '1 / 1',
                                        cursor: 'pointer',
                                        transition: 'transform 0.3s ease',
                                    }}
                                    onClick={(e) => handleImageClick(e, imageUrl, index)}
                                    onMouseEnter={(e) => {
                                        if (componentData.events?.onHover?.type === 'zoomIn') {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (componentData.events?.onHover?.type === 'zoomIn') {
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }
                                    }}
                                >
                                    <img
                                        src={imageUrl || 'https://via.placeholder.com/150'}
                                        alt={`Gallery ${index + 1}`}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                        {children.map((child, index) =>
                            React.cloneElement(
                                renderComponentContent(
                                    child.type,
                                    child.componentData || {},
                                    child.styles || {},
                                    child.children || [],
                                    isCanvas,
                                    onSelectChild,
                                    parentId,
                                    child.id,
                                    isTemplateMode,
                                    viewMode
                                ),
                                { key: child.id || index }
                            )
                        )}
                    </div>
                </>
            );
        }

        // Advanced Components
        case 'countdown': {
            return <CountdownRenderer componentData={componentData} styles={baseStyles} />;
        }

        case 'carousel': {
            return <CarouselRenderer componentData={componentData} styles={baseStyles} />;
        }

        case 'accordion': {
            return <AccordionRenderer componentData={componentData} styles={baseStyles} />;
        }

        case 'tabs': {
            return <TabsRenderer componentData={componentData} styles={baseStyles} />;
        }

        case 'progress': {
            return <ProgressRenderer componentData={componentData} styles={baseStyles} />;
        }

        case 'progress-circle': {
            return (
                <div style={{ ...baseStyles, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        border: `${componentData.strokeWidth || 12}px solid ${componentData.color || '#10b981'}`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: componentData.color || '#10b981'
                    }}>
                        {componentData.value || 0}%
                    </div>
                </div>
            );
        }

        case 'rating': {
            return <RatingRenderer componentData={componentData} styles={baseStyles} />;
        }

        case 'social-proof': {
            return <SocialProofRenderer componentData={componentData} styles={baseStyles} />;
        }

        case 'social-proof-stats': {
            return <SocialProofStatsRenderer componentData={componentData} styles={baseStyles} />;
        }

        default: {
            return (
                <div
                    style={{
                        color: componentData.errorColor || '#ff0000',
                        padding: '10px',
                        border: '1px dashed #ff0000',
                        borderRadius: '4px',
                        ...baseStyles,
                    }}
                >
                    Unknown Component: {type}
                </div>
            );
        }
    }
};

// PropTypes for type checking
renderComponentContent.propTypes = {
    type: PropTypes.string.isRequired,
    componentData: PropTypes.object,
    styles: PropTypes.object,
    children: PropTypes.array,
    isCanvas: PropTypes.bool,
    onSelectChild: PropTypes.func,
    parentId: PropTypes.string,
    childId: PropTypes.string,
    isTemplateMode: PropTypes.bool,
    viewMode: PropTypes.string,
};

getCanvasPosition.propTypes = {
    mouseX: PropTypes.number.isRequired,
    mouseY: PropTypes.number.isRequired,
    containerElement: PropTypes.instanceOf(Element),
    zoomLevel: PropTypes.number.isRequired,
};

snapToGrid.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    gridSize: PropTypes.number.isRequired,
    snapPoints: PropTypes.arrayOf(
        PropTypes.shape({
            x: PropTypes.number,
            y: PropTypes.number,
        })
    ),
};

getElementBounds.propTypes = {
    element: PropTypes.shape({
        position: PropTypes.shape({
            desktop: PropTypes.shape({
                x: PropTypes.number,
                y: PropTypes.number,
            }),
        }),
        size: PropTypes.shape({
            width: PropTypes.number,
            height: PropTypes.number,
        }),
    }).isRequired,
};

processStyles.propTypes = {
    styles: PropTypes.object.isRequired,
    className: PropTypes.string.isRequired,
};