// ==================== EVENT RUNTIME GENERATOR ====================

/**
 * Generate runtime script để xử lý events trong HTML tĩnh
 * @param {Array} events - Danh sách events từ pageData
 * @param {Array} popups - Danh sách popup elements
 * @returns {string} - JavaScript code
 */
const generateEventRuntime = (events, popups) => {
    return `
    // Landing Page Builder Runtime v1.0
    (function() {
        'use strict';
        
        window.LPB = window.LPB || {};
        
        // ========== POPUP MANAGER ==========
        LPB.popups = {
            active: new Set(),
            
            open: function(popupId, data) {
                const popup = document.getElementById(popupId);
                if (!popup) {
                    console.error('[LPB] Popup not found:', popupId);
                    return;
                }
                
                // Update content nếu có data
                if (data && data.html) {
                    const content = popup.querySelector('.lpb-popup-body');
                    if (content) content.innerHTML = data.html;
                }
                
                // Show popup
                popup.classList.add('lpb-popup-active');
                document.body.style.overflow = 'hidden';
                this.active.add(popupId);
                
                // Analytics tracking
                if (window.gtag) {
                    gtag('event', 'popup_open', {
                        event_category: 'Engagement',
                        event_label: popupId
                    });
                }
            },
            
            close: function(popupId) {
                const popup = document.getElementById(popupId);
                if (popup) {
                    popup.classList.remove('lpb-popup-active');
                    this.active.delete(popupId);
                    
                    // Restore scroll nếu không còn popup nào
                    if (this.active.size === 0) {
                        document.body.style.overflow = '';
                    }
                }
            },
            
            closeAll: function() {
                this.active.forEach(id => this.close(id));
            }
        };
        
        // ========== API MANAGER ==========
        LPB.api = {
            cache: new Map(),
            
            getCacheKey: function(endpoint, params) {
                return endpoint + JSON.stringify(params || {});
            },
            
            fetch: async function(endpoint, options = {}) {
                const cacheKey = this.getCacheKey(endpoint, options.params);
                
                // Check cache
                if (this.cache.has(cacheKey)) {
                    const cached = this.cache.get(cacheKey);
                    const now = Date.now();
                    const TTL = options.ttl || 5 * 60 * 1000; // 5 phút default
                    
                    if (now - cached.timestamp < TTL) {
                        console.log('[LPB] Cache hit:', endpoint);
                        return cached.data;
                    }
                }
                
                // Fetch mới
                try {
                    console.log('[LPB] Fetching:', endpoint);
                    const response = await fetch(endpoint, {
                        method: options.method || 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            ...options.headers
                        },
                        body: options.data ? JSON.stringify(options.data) : undefined
                    });
                    
                    if (!response.ok) {
                        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                    }
                    
                    const data = await response.json();
                    
                    // Cache result
                    this.cache.set(cacheKey, {
                        data: data,
                        timestamp: Date.now()
                    });
                    
                    return data;
                } catch (error) {
                    console.error('[LPB] API Error:', error);
                    throw error;
                }
            },
            
            clearCache: function(endpoint) {
                if (endpoint) {
                    for (let key of this.cache.keys()) {
                        if (key.startsWith(endpoint)) {
                            this.cache.delete(key);
                        }
                    }
                } else {
                    this.cache.clear();
                }
            }
        };
        
        // ========== EVENT HANDLER ==========
        LPB.handleEvent = async function(config) {
            const { type } = config;
            
            try {
                switch(type) {
                    case 'openPopup':
                        if (!config.popupId) {
                            console.error('[LPB] Missing popupId');
                            return;
                        }
                        this.popups.open(config.popupId, config.data);
                        break;
                        
                    case 'closePopup':
                        const targetPopupId = config.popupId || config.elementId;
                        if (!targetPopupId) {
                            console.error('[LPB] Missing popupId');
                            return;
                        }
                        this.popups.close(targetPopupId);
                        break;
                        
                    case 'triggerApi':
                        if (!config.apiUrl) {
                            console.error('[LPB] Missing apiUrl');
                            return;
                        }
                        const data = await this.api.fetch(config.apiUrl, {
                            method: config.method || 'GET',
                            params: config.params,
                            data: config.data
                        });
                        
                        // Update target nếu có
                        if (config.updateTarget) {
                            const target = document.getElementById(config.updateTarget);
                            if (target && data.html) {
                                target.innerHTML = data.html;
                            }
                        }
                        break;
                        
                    case 'both':
                        // Open popup immediately với loading
                        this.popups.open(config.popupId, { 
                            html: '<div style="text-align:center;padding:40px;"><div class="lpb-spinner"></div><p>Đang tải...</p></div>' 
                        });
                        
                        // Fetch API in background
                        const apiData = await this.api.fetch(config.apiUrl, {
                            method: config.method || 'GET',
                            params: config.params
                        });
                        
                        // Update popup content
                        this.popups.open(config.popupId, { html: apiData.html || JSON.stringify(apiData) });
                        break;
                        
                    case 'navigate':
                        if (!config.url) {
                            console.error('[LPB] Missing url');
                            return;
                        }
                        if (config.newTab) {
                            window.open(config.url, '_blank');
                        } else {
                            window.location.href = config.url;
                        }
                        break;
                        
                    case 'scrollToSection':
                        if (!config.sectionId) {
                            console.error('[LPB] Missing sectionId');
                            return;
                        }
                        const section = document.querySelector(\`[data-element-id="\${config.sectionId}"]\`);
                        if (section) {
                            section.scrollIntoView({ 
                                behavior: config.smooth !== false ? 'smooth' : 'auto',
                                block: 'start'
                            });
                        } else {
                            console.error('[LPB] Section not found:', config.sectionId);
                        }
                        break;
                        
                    case 'submitForm':
                        if (!config.apiUrl) {
                            console.error('[LPB] Missing apiUrl');
                            return;
                        }
                        console.log('[LPB] Form submit to:', config.apiUrl);
                        break;
                        
                    default:
                        console.warn('[LPB] Unknown event type:', type);
                }
            } catch (error) {
                console.error('[LPB] Event handling error:', error);
                alert('Có lỗi xảy ra: ' + error.message);
            }
        };
        
        // ========== AUTO-BIND EVENTS ==========
        const eventsConfig = ${JSON.stringify(events)};
        
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[LPB] Initializing events...', eventsConfig.length);
            
            eventsConfig.forEach(config => {
                const element = document.getElementById(config.elementId);
                if (!element) {
                    console.warn('[LPB] Element not found:', config.elementId);
                    return;
                }
                
                // Bind onClick
                if (config.events.onClick && config.events.onClick.type !== 'none') {
                    element.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        LPB.handleEvent(config.events.onClick);
                    });
                    
                    element.style.cursor = 'pointer';
                }
                
                // Bind hover prefetch
                if (config.events.onClick?.params?.apiConfig?.preload) {
                    element.addEventListener('mouseenter', function() {
                        LPB.api.fetch(
                            config.events.onClick.params.apiConfig.endpoint,
                            config.events.onClick.params.apiConfig
                        ).catch(() => {}); // Silent prefetch
                    }, { once: true });
                }
                
                // Bind onHover effects
                if (config.events.onHover) {
                    const hoverClass = config.events.onHover.className;
                    if (hoverClass) {
                        element.addEventListener('mouseenter', function() {
                            this.classList.add(hoverClass);
                        });
                        element.addEventListener('mouseleave', function() {
                            this.classList.remove(hoverClass);
                        });
                    }
                }
            });
            
            console.log('[LPB] Events initialized!');
        });
        
        // ========== ESC TO CLOSE POPUP ==========
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                LPB.popups.closeAll();
            }
        });

        // ========== RESPONSIVE POSITIONING HANDLER ==========
        LPB.responsive = {
            currentBreakpoint: 'desktop',

            getBreakpoint: function() {
                const width = window.innerWidth;
                if (width <= 480) return 'mobile';
                if (width <= 768) return 'tablet';
                return 'desktop';
            },

            updateElementPositions: function() {
                const breakpoint = this.getBreakpoint();
                if (breakpoint === this.currentBreakpoint) return;

                this.currentBreakpoint = breakpoint;
                console.log('[LPB] Breakpoint changed to:', breakpoint);

                // Update sections
                const sections = document.querySelectorAll('.lpb-section[data-mobile-y]');
                sections.forEach(section => {
                    const y = section.getAttribute(\`data-\${breakpoint}-y\`) || section.getAttribute('data-desktop-y') || 0;
                    if (breakpoint !== 'desktop') {
                        section.style.setProperty('top', \`\${y}px\`, 'important');
                    }
                });

                // Update child elements
                const elements = document.querySelectorAll('.lpb-element[data-mobile-x]');
                elements.forEach(element => {
                    const x = element.getAttribute(\`data-\${breakpoint}-x\`) || element.getAttribute('data-desktop-x') || 0;
                    const y = element.getAttribute(\`data-\${breakpoint}-y\`) || element.getAttribute('data-desktop-y') || 0;

                    if (breakpoint === 'mobile' || breakpoint === 'tablet') {
                        element.style.setProperty('left', \`\${x}px\`, 'important');
                        element.style.setProperty('top', \`\${y}px\`, 'important');
                    }
                });
            }
        };

        // Initialize responsive positions on load
        document.addEventListener('DOMContentLoaded', function() {
            LPB.responsive.updateElementPositions();
        });

        // Update on window resize (debounced)
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                LPB.responsive.updateElementPositions();
            }, 150);
        });

        console.log('[LPB] Runtime loaded');
    })();
    `;
};

/**
 * Extract tất cả events từ pageData elements
 * @param {Object} pageData - Page data object
 * @returns {Array} - Array of event configs
 */
const extractEvents = (pageData) => {
    const events = [];

    const processElement = (element, parentId = null) => {
        const elementId = element.id;

        // Check element events
        if (element.componentData?.events) {
            events.push({
                elementId: elementId,
                events: element.componentData.events,
                type: element.type,
                parentId: parentId
            });
        }

        // Check children events
        if (Array.isArray(element.children)) {
            element.children.forEach(child => {
                if (child.componentData?.events) {
                    events.push({
                        elementId: child.id,
                        events: child.componentData.events,
                        type: child.type,
                        parentId: elementId
                    });
                }

                // Recursive cho nested children
                if (Array.isArray(child.children)) {
                    processElement(child, child.id);
                }
            });
        }
    };

    pageData.elements.forEach(element => {
        processElement(element);
    });

    return events;
};

/**
 * Render tất cả popups thành HTML
 * @param {Array} popups - Array of popup elements
 * @returns {string} - HTML string
 */
const renderPopupsHTML = (popups) => {
    return popups.map(popup => {
        const { id, componentData = {}, styles = {}, size = {}, children = [] } = popup;

        // Render children content
        const childrenHTML = children.map(child =>
            renderElementHTML(child, true)
        ).join('');

        return `
            <div 
                id="${id}" 
                class="lpb-popup" 
                data-element-id="${id}"
                style="display:none;"
            >
                <!-- Overlay -->
                <div 
                    class="lpb-popup-overlay" 
                    onclick="LPB.popups.close('${id}')"
                ></div>
                
                <!-- Popup Container -->
                <div 
                    class="lpb-popup-container"
                    style="
                        width: ${size.width || 600}px;
                        max-width: 90vw;
                        min-height: ${size.height || 400}px;
                        background: ${styles.background || componentData.background || 'rgba(255, 255, 255, 0.95)'};
                        border-radius: ${styles.borderRadius || componentData.borderRadius || '12px'};
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
                    "
                >
                    <!-- Header -->
                    <div class="lpb-popup-header">
                        <h3 style="margin:0; font-size:16px; font-weight:600; color:#111827;">
                            ${componentData.title || 'Popup Title'}
                        </h3>
                        <button 
                            class="lpb-popup-close" 
                            onclick="LPB.popups.close('${id}')"
                            aria-label="Close popup"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <!-- Body -->
                    <div class="lpb-popup-body" style="padding: ${componentData.padding || '20px'};">
                        ${childrenHTML || `<p style="color:#6b7280;">${componentData.content || 'Popup content'}</p>`}
                    </div>
                </div>
            </div>
        `;
    }).join('\n');
};

/**
 * Render một element thành HTML với proper ID
 * @param {Object} element - Element object
 * @param {boolean} isChild - Whether this is a child element
 * @returns {string} - HTML string
 */
const renderElementHTML = (element, isChild = false) => {
    const { id, type, componentData = {}, styles = {}, size = {}, position = {}, children = [] } = element;

    // Convert styles object to inline CSS
    const inlineStyles = Object.entries(styles)
        .filter(([key]) => !key.startsWith(':') && !key.startsWith('@'))
        .map(([key, value]) => {
            const kebabKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
            return `${kebabKey}:${value}`;
        })
        .join(';');

    // Position data attributes for responsive positioning
    const positionDataAttrs = isChild ? `
        data-desktop-x="${position.desktop?.x || 0}"
        data-desktop-y="${position.desktop?.y || 0}"
        data-tablet-x="${position.tablet?.x || position.desktop?.x || 0}"
        data-tablet-y="${position.tablet?.y || position.desktop?.y || 0}"
        data-mobile-x="${position.mobile?.x || position.desktop?.x || 0}"
        data-mobile-y="${position.mobile?.y || position.desktop?.y || 0}"
    ` : '';

    // Base attributes
    const baseAttrs = `
        id="${id}"
        data-element-id="${id}"
        data-type="${type}"
        class="lpb-element lpb-${type}"
        ${positionDataAttrs}
    `;

    // Position styles cho child elements
    const positionStyles = isChild ? `
        position: absolute;
        left: ${position.desktop?.x || 0}px;
        top: ${position.desktop?.y || 0}px;
        width: ${size.width || 200}px;
        height: ${size.height || 50}px;
    ` : '';

    // Render based on type
    switch(type) {
        case 'section':
            return renderSectionHTML(element);

        case 'button':
            return `
                <button
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.content || 'Button'}
                </button>
            `;

        case 'heading':
            const HeadingTag = componentData.level || 'h2';
            return `
                <${HeadingTag}
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.content || 'Heading'}
                </${HeadingTag}>
            `;

        case 'paragraph':
            return `
                <p
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.content || 'Paragraph'}
                </p>
            `;

        case 'image':
            return `
                <img
                    ${baseAttrs}
                    src="${componentData.src || componentData.imageUrl || 'https://via.placeholder.com/150'}"
                    alt="${componentData.alt || 'Image'}"
                    style="${inlineStyles}; ${positionStyles}"
                />
            `;

        case 'icon':
            const isSvg = componentData.icon?.startsWith('<svg');
            return `
                <div
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                    title="${componentData.title || ''}"
                >
                    ${componentData.imageUrl
                ? `<img src="${componentData.imageUrl}" alt="${componentData.title || 'Icon'}" style="width:100%;height:100%;object-fit:contain;" />`
                : isSvg
                    ? componentData.icon
                    : componentData.icon
                        ? `<i class="${componentData.icon}"></i>`
                        : '📦'
            }
                </div>
            `;

        case 'gallery':
            return renderGalleryHTML(element, isChild);

        default:
            return `
                <div
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.content || type}
                </div>
            `;
    }
};

/**
 * Render gallery element
 */
const renderGalleryHTML = (element, isChild) => {
    const { id, componentData = {}, styles = {}, size = {}, position = {} } = element;

    const positionStyles = isChild ? `
        position: absolute;
        left: ${position.desktop?.x || 0}px;
        top: ${position.desktop?.y || 0}px;
    ` : '';

    const images = componentData.images || [];

    return `
        <div 
            id="${id}"
            data-element-id="${id}"
            data-type="gallery"
            class="lpb-element lpb-gallery"
            style="${positionStyles} width: ${size.width || 380}px; height: ${size.height || 300}px;"
        >
            <div style="
                display: ${styles.display || 'grid'};
                grid-template-columns: ${styles.gridTemplateColumns || 'repeat(auto-fill, minmax(150px, 1fr))'};
                gap: ${styles.gap || '10px'};
                width: 100%;
                height: 100%;
            ">
                ${images.map((imageUrl, index) => `
                    <div style="
                        position: relative;
                        overflow: hidden;
                        border-radius: ${styles.borderRadius || '8px'};
                        aspect-ratio: 1 / 1;
                    ">
                        <img
                            src="${imageUrl || 'https://via.placeholder.com/150'}"
                            alt="Gallery ${index + 1}"
                            style="
                                width: 100%;
                                height: 100%;
                                object-fit: ${styles.objectFit || 'cover'};
                                object-position: ${styles.objectPosition || 'center'};
                            "
                            loading="lazy"
                        />
                    </div>
                `).join('')}
                ${images.length === 0 ? `
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: #9ca3af;
                        text-align: center;
                        grid-column: 1 / -1;
                    ">
                        <i class="fas fa-image" style="font-size: 48px; margin-bottom: 8px;"></i>
                        <p>Empty gallery</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
};

/**
 * Render section với children
 */
const renderSectionHTML = (section) => {
    const { id, componentData = {}, styles = {}, size = {}, position = {}, children = [] } = section;

    // Render children
    const childrenHTML = children.map(child =>
        renderElementHTML(child, true)
    ).join('\n');

    return `
        <section
            id="${id}"
            data-element-id="${id}"
            class="lpb-section ladi-section"
            data-desktop-y="${position.desktop?.y || 0}"
            data-tablet-y="${position.tablet?.y || position.desktop?.y || 0}"
            data-mobile-y="${position.mobile?.y || position.desktop?.y || 0}"
            style="
                position: absolute;
                top: ${position.desktop?.y || 0}px;
                left: 50%;
                transform: translateX(-50%);
                width: 1200px;
                height: ${size.height || 400}px;
            "
        >
            <!-- Background -->
            <div class="ladi-section-background" style="
                position: absolute;
                inset: 0;
                z-index: 0;
                background-color: ${componentData.backgroundColor || styles.backgroundColor || 'transparent'};
                background-image: ${componentData.backgroundImage ? `url(${componentData.backgroundImage})` : 'none'};
                background-size: cover;
                background-position: center;
            "></div>

            <!-- Overlay -->
            <div class="ladi-overlay" style="
                position: absolute;
                inset: 0;
                z-index: 0;
                background-color: ${componentData.overlayColor || 'transparent'};
                opacity: ${componentData.overlayOpacity || 0};
            "></div>

            <!-- Container -->
            <div class="ladi-container" style="
                position: relative;
                z-index: 1;
                padding: ${componentData.padding || styles.padding || '20px'};
                width: 100%;
                height: 100%;
            ">
                ${childrenHTML}
            </div>
        </section>
    `;
};

/**
 * Generate CSS từ pageData
 */
const generateCSS = (pageData) => {
    let css = `
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }

        .lpb-element {
            transition: all 0.3s ease;
        }

        /* Base responsive images */
        .lpb-element img {
            max-width: 100%;
            height: auto;
        }
    `;

    // Extract pseudo-classes và animations từ elements
    pageData.elements.forEach(element => {
        const { id, styles = {} } = element;

        // Process hover states
        if (styles[':hover']) {
            css += `\n#${id}:hover {`;
            Object.entries(styles[':hover']).forEach(([key, value]) => {
                const kebabKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
                css += `${kebabKey}:${value};`;
            });
            css += `}`;
        }

        // Process keyframes
        Object.entries(styles).forEach(([key, value]) => {
            if (key.startsWith('@keyframes')) {
                css += `\n${key} {`;
                Object.entries(value).forEach(([frame, props]) => {
                    css += `${frame} {`;
                    Object.entries(props).forEach(([prop, val]) => {
                        const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
                        css += `${kebabProp}:${val};`;
                    });
                    css += `}`;
                });
                css += `}`;
            }
        });

        // Process children
        if (element.children) {
            element.children.forEach(child => {
                if (child.styles?.[':hover']) {
                    css += `\n#${child.id}:hover {`;
                    Object.entries(child.styles[':hover']).forEach(([key, value]) => {
                        const kebabKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
                        css += `${kebabKey}:${value};`;
                    });
                    css += `}`;
                }
            });
        }
    });

    // Generate responsive positioning CSS for all elements with data attributes
    css += `\n\n/* Responsive Tablet (≤768px) */`;
    css += `\n@media (max-width: 768px) {`;

    pageData.elements.forEach(element => {
        if (element.type === 'section') {
            css += `\n    #${element.id} { top: var(--tablet-y-${element.id}, ${element.position?.tablet?.y || element.position?.desktop?.y || 0}px); }`;

            // Process children positioning
            if (element.children) {
                element.children.forEach(child => {
                    const tabletX = child.position?.tablet?.x || child.position?.desktop?.x || 0;
                    const tabletY = child.position?.tablet?.y || child.position?.desktop?.y || 0;
                    css += `\n    #${child.id} { left: ${tabletX}px; top: ${tabletY}px; }`;
                });
            }
        }
    });

    css += `\n}`;

    // Generate responsive positioning CSS for mobile
    css += `\n\n/* Responsive Mobile (≤480px) */`;
    css += `\n@media (max-width: 480px) {`;

    pageData.elements.forEach(element => {
        if (element.type === 'section') {
            css += `\n    #${element.id} { top: var(--mobile-y-${element.id}, ${element.position?.mobile?.y || element.position?.desktop?.y || 0}px); }`;

            // Process children positioning
            if (element.children) {
                element.children.forEach(child => {
                    const mobileX = child.position?.mobile?.x || child.position?.desktop?.x || 0;
                    const mobileY = child.position?.mobile?.y || child.position?.desktop?.y || 0;
                    css += `\n    #${child.id} { left: ${mobileX}px; top: ${mobileY}px; }`;
                });
            }
        }
    });

    css += `\n}`;

    // Generate responsive CSS for very small screens (≤360px)
    css += `\n\n/* Responsive Very Small Screens (≤360px) */`;
    css += `\n@media (max-width: 360px) {`;
    css += `\n    /* Scale down font sizes for very small screens */`;
    css += `\n    .lpb-heading, h1, h2, h3, h4, h5, h6 { font-size: 85% !important; }`;
    css += `\n    .lpb-paragraph, p { font-size: 90% !important; line-height: 1.4 !important; }`;
    css += `\n    .lpb-button { font-size: 85% !important; padding: 8px 16px !important; }`;
    css += `\n    .ladi-container { padding: 12px !important; }`;
    css += `\n}`;

    return css;
};

/**
 * Render toàn bộ pageData thành static HTML với embedded runtime
 * @param {Object} pageData - Page data
 * @returns {string} - Complete HTML document
 */
export const renderStaticHTML = (pageData) => {
    // Extract components
    const popups = pageData.elements.filter(el => el.type === 'popup');
    const sections = pageData.elements.filter(el => el.type === 'section');
    const events = extractEvents(pageData);

    // Generate HTML parts
    const sectionsHTML = sections.map(section => renderSectionHTML(section)).join('\n');
    const popupsHTML = renderPopupsHTML(popups);
    const runtimeScript = generateEventRuntime(events, popups);

    // Generate CSS
    const cssContent = generateCSS(pageData);

    // Combine everything
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${pageData.meta?.description || 'Landing page generated by LandingHub'}">
    <title>${pageData.meta?.title || 'Landing Page'}</title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    
    <!-- Styles -->
    <style>
        ${cssContent}
        
        /* Popup Styles */
        .lpb-popup {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
        }
        
        .lpb-popup.lpb-popup-active {
            display: flex;
        }
        
        .lpb-popup-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            cursor: pointer;
        }
        
        .lpb-popup-container {
            position: relative;
            z-index: 1;
            background: white;
            border-radius: 12px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .lpb-popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e7eb;
            background: linear-gradient(to bottom, #f9fafb, #ffffff);
        }
        
        .lpb-popup-close {
            width: 28px;
            height: 28px;
            border: none;
            background: transparent;
            cursor: pointer;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
            color: #6b7280;
            font-size: 18px;
            font-weight: bold;
        }
        
        .lpb-popup-close:hover {
            background: #f3f4f6;
            color: #111827;
        }
        
        .lpb-popup-body {
            padding: 20px;
        }
        
        /* Loading Spinner */
        .lpb-spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* ========== RESPONSIVE STYLES ========== */

        /* Tablet (≤1024px) */
        @media (max-width: 1024px) {
            .lpb-section {
                width: 95% !important;
                max-width: 768px !important;
            }

            .ladi-container {
                padding: 16px !important;
            }
        }

        /* Mobile (≤768px) */
        @media (max-width: 768px) {
            .lpb-section {
                width: 100% !important;
                max-width: 100% !important;
                left: 0 !important;
                transform: none !important;
            }

            .ladi-container {
                padding: 16px !important;
            }

            .lpb-popup-container {
                width: 90% !important;
                max-width: 90vw !important;
                min-height: auto !important;
            }

            .lpb-popup-body {
                padding: 16px !important;
            }

            /* Scale down typography */
            .lpb-heading, h1 {
                font-size: clamp(24px, 5vw, 32px) !important;
            }

            .lpb-heading, h2 {
                font-size: clamp(20px, 4.5vw, 28px) !important;
            }

            .lpb-heading, h3 {
                font-size: clamp(18px, 4vw, 24px) !important;
            }

            .lpb-paragraph, p {
                font-size: clamp(14px, 3.5vw, 16px) !important;
                line-height: 1.6 !important;
            }

            .lpb-button {
                font-size: clamp(14px, 3.5vw, 16px) !important;
                padding: 10px 20px !important;
            }

            /* Responsive images and galleries */
            .lpb-gallery {
                width: 100% !important;
                height: auto !important;
            }

            .lpb-image, .lpb-element img {
                max-width: 100% !important;
                height: auto !important;
            }
        }

        /* Small Mobile (≤480px) */
        @media (max-width: 480px) {
            .ladi-container {
                padding: 12px !important;
            }

            .lpb-popup-body {
                padding: 12px !important;
            }

            .lpb-heading, h1 {
                font-size: clamp(20px, 5vw, 28px) !important;
            }

            .lpb-heading, h2 {
                font-size: clamp(18px, 4.5vw, 24px) !important;
            }

            .lpb-heading, h3 {
                font-size: clamp(16px, 4vw, 20px) !important;
            }

            .lpb-paragraph, p {
                font-size: clamp(13px, 3.5vw, 15px) !important;
            }

            .lpb-button {
                padding: 8px 16px !important;
                min-height: 40px !important;
            }
        }

        /* Very Small Screens (≤360px) */
        @media (max-width: 360px) {
            body {
                font-size: 14px !important;
            }

            .ladi-container {
                padding: 10px !important;
            }

            .lpb-popup-container {
                width: 95% !important;
                border-radius: 8px !important;
            }

            .lpb-popup-body {
                padding: 10px !important;
            }

            .lpb-popup-header {
                padding: 12px 16px !important;
            }

            .lpb-heading, h1 {
                font-size: clamp(18px, 5vw, 24px) !important;
            }

            .lpb-heading, h2 {
                font-size: clamp(16px, 4.5vw, 20px) !important;
            }

            .lpb-heading, h3, h4 {
                font-size: clamp(15px, 4vw, 18px) !important;
            }

            .lpb-paragraph, p {
                font-size: clamp(12px, 3.5vw, 14px) !important;
                line-height: 1.5 !important;
            }

            .lpb-button {
                font-size: 13px !important;
                padding: 8px 12px !important;
                min-height: 36px !important;
            }

            /* Reduce icon sizes */
            .lpb-icon {
                width: 80% !important;
                height: 80% !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Canvas -->
    <div id="lpb-canvas" style="
        position: relative;
        min-height: 100vh;
        background: ${pageData.canvas?.background || '#ffffff'};
    ">
        ${sectionsHTML}
    </div>
    
    <!-- Popups -->
    ${popupsHTML}
    
    <!-- Runtime Script -->
    <script>
        ${runtimeScript}
    </script>
    
    <!-- Google Analytics (optional) -->
    ${pageData.analytics?.googleAnalyticsId ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${pageData.analytics.googleAnalyticsId}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${pageData.analytics.googleAnalyticsId}');
    </script>
    ` : ''}
</body>
</html>`;
};
const findElementById = (elements, id) => {
    for (const element of elements) {
        if (element.id === id) return element;

        if (element.children && element.children.length > 0) {
            const found = findElementById(element.children, id);
            if (found) return found;
        }
    }
    return null;
};
/**
 * Parse HTML string thành pageData structure đầy đủ
 * @param {string} htmlString - HTML content từ S3
 * @returns {Object} pageData với cấu trúc { canvas, elements, meta }
 */
export const parseHTMLToPageData = (htmlString) => {
    const pageData = {
        canvas: {
            width: 1200,
            height: 'auto',
            background: '#ffffff'
        },
        elements: [],
        meta: {
            title: 'Untitled',
            description: '',
            keywords: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        analytics: {}
    };

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        // ========== PARSE META ==========
        const titleEl = doc.querySelector('title');
        if (titleEl) {
            pageData.meta.title = titleEl.textContent.trim() || 'Untitled';
        }

        const descEl = doc.querySelector('meta[name="description"]');
        if (descEl) {
            pageData.meta.description = descEl.getAttribute('content') || '';
        }

        const keywordsEl = doc.querySelector('meta[name="keywords"]');
        if (keywordsEl) {
            pageData.meta.keywords = keywordsEl.getAttribute('content')?.split(',').map(k => k.trim()) || [];
        }

        const analyticsScript = doc.querySelector('script[src*="googletagmanager"]');
        if (analyticsScript) {
            const gaId = analyticsScript.src.match(/id=([A-Za-z0-9-_]+)/);
            if (gaId) {
                pageData.analytics.googleAnalyticsId = gaId[1];
            }
        }

        // ========== TRY 1: PARSE EMBEDDED pageData (ƯU TIÊN) ==========
        const pageDataScript = doc.querySelector('script[type="application/json"][id="lpb-page-data"]');
        if (pageDataScript) {
            try {
                const embeddedData = JSON.parse(pageDataScript.textContent || pageDataScript.innerHTML);
                console.log('✅ Found embedded pageData in <script id="lpb-page-data">');

                // Validate và normalize embedded pageData
                if (embeddedData.canvas && Array.isArray(embeddedData.elements) && embeddedData.meta) {
                    pageData.canvas = {
                        width: embeddedData.canvas.width || 1200,
                        height: embeddedData.canvas.height || 'auto',
                        background: embeddedData.canvas.background || '#ffffff'
                    };
                    pageData.elements = normalizeElements(embeddedData.elements);
                    pageData.meta = {
                        title: embeddedData.meta.title || pageData.meta.title,
                        description: embeddedData.meta.description || pageData.meta.description,
                        keywords: embeddedData.meta.keywords || pageData.meta.keywords,
                        created_at: embeddedData.meta.created_at || pageData.meta.created_at,
                        updated_at: embeddedData.meta.updated_at || pageData.meta.updated_at
                    };
                    pageData.analytics = embeddedData.analytics || pageData.analytics;
                    return pageData; // Trả về ngay nếu embedded pageData hợp lệ
                } else {
                    console.warn('⚠️ Embedded pageData không hợp lệ, fallback parse HTML');
                }
            } catch (parseError) {
                console.warn('⚠️ Failed to parse embedded pageData JSON:', parseError.message);
            }
        }

        // ========== TRY 2: PARSE HTML STRUCTURE ==========
        console.log('🔍 Parsing HTML structure...');

        // Parse canvas từ #lpb-canvas
        const canvasEl = doc.getElementById('lpb-canvas');
        if (canvasEl) {
            const canvasStyle = canvasEl.style;
            pageData.canvas = {
                width: parseInt(canvasStyle.width) || 1200,
                height: canvasStyle.height || 'auto',
                background: canvasStyle.background || canvasStyle.backgroundColor || '#ffffff',
                minHeight: canvasStyle.minHeight || '100vh'
            };
        }

        // Parse sections
        const sections = doc.querySelectorAll('section.lpb-section, section.ladi-section, section[data-element-id]');
        sections.forEach((sectionEl, index) => {
            const section = parseSectionElement(sectionEl, index);
            if (section) {
                pageData.elements.push(section);
            }
        });

        // Parse popups
        const popups = doc.querySelectorAll('div.lpb-popup, div[data-type="popup"]');
        popups.forEach((popupEl, index) => {
            const popup = parsePopupElement(popupEl, index);
            if (popup) {
                pageData.elements.push(popup);
            }
        });

        // Parse standalone elements
        const standaloneElements = doc.querySelectorAll('div.lpb-element:not(section):not(.lpb-popup):not(.lpb-child-element), [data-element-id]:not(.lpb-section):not(.lpb-popup)');
        standaloneElements.forEach((el, index) => {
            if (!el.closest('section.lpb-section, div.lpb-popup')) {
                const element = parseStandaloneElement(el, index);
                if (element) {
                    pageData.elements.push(element);
                }
            }
        });

        // Parse events từ runtime script
        const runtimeScripts = doc.querySelectorAll('script');
        runtimeScripts.forEach(script => {
            const content = script.textContent || script.innerHTML;
            const eventsConfig = extractEventsFromScript(content);
            if (eventsConfig.length > 0) {
                mapEventsToElements(pageData.elements, eventsConfig);
            }
        });

        // Parse animations và keyframes từ <style>
        const styleElements = doc.querySelectorAll('style');
        styleElements.forEach(styleEl => {
            const cssContent = styleEl.textContent || styleEl.innerHTML;
            const animations = extractAnimationsFromCSS(cssContent);
            mapAnimationsToElements(pageData.elements, animations);
        });

        // Tính canvas height dựa trên elements
        const maxHeight = Math.max(
            ...pageData.elements.map(el => {
                const elTop = el.position?.desktop?.y || 0;
                const elHeight = el.size?.height || 400;
                return elTop + elHeight;
            }),
            1648
        );
        pageData.canvas.height = maxHeight;

        console.log('✅ HTML parsed successfully:', {
            elementsCount: pageData.elements.length,
            sections: pageData.elements.filter(el => el.type === 'section').length,
            popups: pageData.elements.filter(el => el.type === 'popup').length,
            standalone: pageData.elements.filter(el => el.type !== 'section' && el.type !== 'popup').length
        });

        return pageData;

    } catch (error) {
        console.error('❌ parseHTMLToPageData error:', error);
        return pageData; // Fallback trả về pageData mặc định
    }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize elements để đảm bảo cấu trúc hợp lệ
 * @param {Array} elements - Array of elements
 * @returns {Array} Normalized elements
 */
const normalizeElements = (elements) => {
    return elements.map(el => ({
        id: el.id || `element-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: el.type || 'section',
        componentData: el.componentData || {},
        position: {
            desktop: el.position?.desktop || { x: 0, y: 0, z: 1 },
            tablet: el.position?.tablet || el.position?.desktop || { x: 0, y: 0, z: 1 },
            mobile: el.position?.mobile || el.position?.desktop || { x: 0, y: 0, z: 1 }
        },
        size: el.size || { width: el.type === 'popup' ? 600 : 1200, height: 400 },
        styles: el.styles || {},
        children: Array.isArray(el.children) ? normalizeElements(el.children) : [],
        visible: el.visible !== false,
        locked: !!el.locked
    }));
};

/**
 * Parse section element từ HTML
 * @param {HTMLElement} sectionEl - Section element
 * @param {number} index - Index của section
 * @returns {Object|null} Section object
 */
const parseSectionElement = (sectionEl, index) => {
    const id = sectionEl.id || sectionEl.getAttribute('data-element-id') || `section-${Date.now()}-${index}`;
    const style = sectionEl.style;

    const topMatch = style.top?.match(/(\d+)px/) || ['0'];
    const top = parseInt(topMatch[1]) || 0;
    const widthMatch = style.width?.match(/(\d+)px/) || ['1200'];
    const heightMatch = style.height?.match(/(\d+)px/) || ['400'];
    const width = parseInt(widthMatch[1]) || 1200;
    const height = parseInt(heightMatch[1]) || 400;

    const bgEl = sectionEl.querySelector('.ladi-section-background');
    const overlayEl = sectionEl.querySelector('.ladi-overlay');
    const containerEl = sectionEl.querySelector('.ladi-container');

    const componentData = { structure: sectionEl.classList.contains('ladi-section') ? 'ladi-standard' : 'standard' };

    if (bgEl) {
        const bgStyle = bgEl.style;
        componentData.backgroundColor = bgStyle.backgroundColor || 'transparent';
        const bgImageMatch = bgStyle.backgroundImage?.match(/url\(['"]?(.+?)['"]?\)/);
        if (bgImageMatch) {
            componentData.backgroundImage = bgImageMatch[1];
            componentData.backgroundType = 'image';
        } else if (componentData.backgroundColor !== 'transparent') {
            componentData.backgroundType = 'color';
        }
        componentData.backgroundPosition = bgStyle.backgroundPosition || 'center';
        componentData.backgroundSize = bgStyle.backgroundSize || 'cover';
    }

    if (overlayEl) {
        componentData.overlayColor = overlayEl.style.backgroundColor || 'transparent';
        componentData.overlayOpacity = parseFloat(overlayEl.style.opacity) || 0;
    }

    const styles = parseInlineStyles(style, sectionEl);
    if (containerEl) {
        componentData.padding = containerEl.style.padding || '20px';
    }

    const children = [];
    if (containerEl) {
        const childElements = containerEl.querySelectorAll('.lpb-element[data-element-id], .lpb-child-element');
        childElements.forEach(childEl => {
            if (childEl.closest('.ladi-container') === containerEl) {
                const child = parseChildElement(childEl, id);
                if (child) {
                    children.push(child);
                }
            }
        });
    }

    return {
        id,
        type: 'section',
        componentData,
        position: {
            desktop: { x: 0, y: top, z: parseInt(style.zIndex) || index + 1 },
            tablet: { x: 0, y: top, z: parseInt(style.zIndex) || index + 1 },
            mobile: { x: 0, y: top, z: parseInt(style.zIndex) || index + 1 }
        },
        size: { width, height },
        styles,
        children,
        visible: style.display !== 'none',
        locked: sectionEl.classList.contains('lpb-element-locked')
    };
};

/**
 * Parse popup element từ HTML
 * @param {HTMLElement} popupEl - Popup element
 * @param {number} index - Index của popup
 * @returns {Object|null} Popup object
 */
const parsePopupElement = (popupEl, index) => {
    const id = popupEl.id || popupEl.getAttribute('data-element-id') || `popup-${Date.now()}-${index}`;
    const containerEl = popupEl.querySelector('.lpb-popup-container');
    if (!containerEl) return null;

    const widthMatch = containerEl.style.width?.match(/(\d+)px/) || ['600'];
    const minHeightMatch = containerEl.style.minHeight?.match(/(\d+)px/) || ['400'];
    const width = parseInt(widthMatch[1]) || 600;
    const height = parseInt(minHeightMatch[1]) || 400;

    const headerEl = popupEl.querySelector('.lpb-popup-header h3');
    const bodyEl = popupEl.querySelector('.lpb-popup-body');

    const componentData = {
        title: headerEl?.textContent.trim() || 'Popup',
        background: containerEl.style.background || 'rgba(255, 255, 255, 0.95)',
        borderRadius: containerEl.style.borderRadius || '12px',
        padding: bodyEl?.style.padding || '20px'
    };

    const styles = parseInlineStyles(containerEl.style, popupEl);

    const children = [];
    if (bodyEl) {
        const childElements = bodyEl.querySelectorAll('.lpb-element[data-element-id], .lpb-child-element');
        childElements.forEach(childEl => {
            if (childEl.closest('.lpb-popup-body') === bodyEl) {
                const child = parseChildElement(childEl, id);
                if (child) {
                    children.push(child);
                }
            }
        });
    }

    return {
        id,
        type: 'popup',
        componentData,
        position: {
            desktop: { x: 0, y: 0, z: parseInt(containerEl.style.zIndex) || 1001 },
            tablet: { x: 0, y: 0, z: parseInt(containerEl.style.zIndex) || 1001 },
            mobile: { x: 0, y: 0, z: parseInt(containerEl.style.zIndex) || 1001 }
        },
        size: { width, height },
        styles,
        children,
        visible: popupEl.classList.contains('lpb-popup-active') || popupEl.style.display !== 'none',
        locked: popupEl.classList.contains('lpb-element-locked')
    };
};

/**
 * Parse standalone element từ HTML
 * @param {HTMLElement} element - Standalone element
 * @param {number} index - Index của element
 * @returns {Object|null} Element object
 */
const parseStandaloneElement = (element, index) => {
    const id = element.id || element.getAttribute('data-element-id') || `element-${Date.now()}-${index}`;
    const type = element.getAttribute('data-type') || inferTypeFromElement(element);
    const style = element.style;

    const leftMatch = style.left?.match(/(\d+)px/) || ['0'];
    const topMatch = style.top?.match(/(\d+)px/) || ['0'];
    const widthMatch = style.width?.match(/(\d+)px/) || [type === 'gallery' ? '380' : '200'];
    const heightMatch = style.height?.match(/(\d+)px/) || [type === 'gallery' ? '300' : '50'];
    const left = parseInt(leftMatch[1]) || 0;
    const top = parseInt(topMatch[1]) || 0;
    const width = parseInt(widthMatch[1]) || (type === 'gallery' ? 380 : type === 'icon' ? 50 : 200);
    const height = parseInt(heightMatch[1]) || (type === 'gallery' ? 300 : type === 'icon' ? 50 : 50);

    const styles = parseInlineStyles(style, element);
    const componentData = parseComponentData(element, type);

    return {
        id,
        type,
        componentData,
        position: {
            desktop: { x: left, y: top, z: parseInt(style.zIndex) || index + 1 },
            tablet: { x: left, y: top, z: parseInt(style.zIndex) || index + 1 },
            mobile: { x: left, y: top, z: parseInt(style.zIndex) || index + 1 }
        },
        size: { width, height },
        styles,
        children: [],
        visible: style.display !== 'none',
        locked: element.classList.contains('lpb-element-locked')
    };
};

/**
 * Parse child element từ HTML
 * @param {HTMLElement} element - Child element
 * @param {string} parentId - ID của parent (section/popup)
 * @returns {Object|null} Child element object
 */
const parseChildElement = (element, parentId) => {
    const id = element.id || element.getAttribute('data-element-id') || `child-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const type = element.getAttribute('data-type') || inferTypeFromElement(element);
    const style = element.style;

    const leftMatch = style.left?.match(/(\d+)px/) || ['0'];
    const topMatch = style.top?.match(/(\d+)px/) || ['0'];
    const widthMatch = style.width?.match(/(\d+)px/) || [type === 'gallery' ? '380' : '200'];
    const heightMatch = style.height?.match(/(\d+)px/) || [type === 'gallery' ? '300' : '50'];
    const left = parseInt(leftMatch[1]) || 0;
    const top = parseInt(topMatch[1]) || 0;
    const width = parseInt(widthMatch[1]) || (type === 'gallery' ? 380 : type === 'icon' ? 50 : 200);
    const height = parseInt(heightMatch[1]) || (type === 'gallery' ? 300 : type === 'icon' ? 50 : 50);

    const styles = parseInlineStyles(style, element);
    const componentData = parseComponentData(element, type);

    return {
        id,
        type,
        componentData,
        position: {
            desktop: { x: left, y: top, z: parseInt(style.zIndex) || 10 },
            tablet: { x: left, y: top, z: parseInt(style.zIndex) || 10 },
            mobile: { x: left, y: top, z: parseInt(style.zIndex) || 10 }
        },
        size: { width, height },
        styles,
        children: [],
        visible: style.display !== 'none',
        locked: element.classList.contains('lpb-element-locked'),
        parentId
    };
};

/**
 * Parse componentData dựa trên type
 * @param {HTMLElement} element - Element
 * @param {string} type - Type của element
 * @returns {Object} componentData
 */
const parseComponentData = (element, type) => {
    const componentData = {};

    switch (type) {
        case 'button':
            componentData.content = element.textContent.trim() || 'Button';
            componentData.background = element.style.background || element.style.backgroundColor;
            componentData.color = element.style.color;
            componentData.borderRadius = element.style.borderRadius;
            componentData.border = element.style.border;
            componentData.fontSize = element.style.fontSize;
            componentData.fontWeight = element.style.fontWeight;
            break;

        case 'heading':
            componentData.content = element.textContent.trim() || 'Heading';
            componentData.level = element.tagName.toLowerCase();
            componentData.fontSize = element.style.fontSize;
            componentData.color = element.style.color;
            componentData.fontWeight = element.style.fontWeight;
            componentData.textAlign = element.style.textAlign;
            break;

        case 'paragraph':
            componentData.content = element.textContent.trim() || 'Paragraph';
            componentData.fontSize = element.style.fontSize;
            componentData.color = element.style.color;
            componentData.fontWeight = element.style.fontWeight;
            componentData.lineHeight = element.style.lineHeight;
            componentData.textAlign = element.style.textAlign;
            break;

        case 'image':
            componentData.src = element.getAttribute('src') || 'https://via.placeholder.com/150';
            componentData.alt = element.getAttribute('alt') || 'Image';
            componentData.imageUrl = componentData.src;
            break;

        case 'icon':
            const img = element.querySelector('img');
            const iconEl = element.querySelector('i');
            const svgEl = element.querySelector('svg');
            if (img) {
                componentData.imageUrl = img.getAttribute('src');
                componentData.alt = img.getAttribute('alt') || 'Icon';
            } else if (svgEl) {
                componentData.icon = svgEl.outerHTML;
            } else if (iconEl) {
                componentData.icon = iconEl.className;
            }
            componentData.title = element.getAttribute('title') || '';
            break;

        case 'gallery':
            const images = Array.from(element.querySelectorAll('img')).map(img => img.getAttribute('src') || 'https://via.placeholder.com/150');
            componentData.images = images;
            componentData.display = element.style.display || 'grid';
            componentData.gridTemplateColumns = element.style.gridTemplateColumns || 'repeat(auto-fill, minmax(150px, 1fr))';
            componentData.gap = element.style.gap || '10px';
            break;

        default:
            componentData.content = element.textContent.trim() || '';
            break;
    }

    // Parse animation nếu có
    if (element.style.animation) {
        const animationMatch = element.style.animation.match(/(\S+)\s*(\d+\.?\d*ms)\s*(\w+)\s*(\d+\.?\d*ms)?\s*(infinite)?/);
        if (animationMatch) {
            componentData.animation = {
                type: animationMatch[1],
                duration: parseFloat(animationMatch[2]) || 1000,
                timing: animationMatch[3] || 'ease',
                delay: parseFloat(animationMatch[4]) || 0,
                repeat: !!animationMatch[5]
            };
        }
    }

    return componentData;
};

/**
 * Parse inline styles và pseudo-classes từ element
 * @param {CSSStyleDeclaration} styleObj - Style object
 * @param {HTMLElement} element - HTML element
 * @returns {Object} styles
 */
const parseInlineStyles = (styleObj, element) => {
    const styles = {};
    const importantProps = [
        'background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
        'color', 'fontSize', 'fontWeight', 'fontFamily',
        'border', 'borderRadius', 'boxShadow', 'textShadow',
        'padding', 'margin', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'display', 'alignItems', 'justifyContent', 'flexDirection', 'gap',
        'gridTemplateColumns', 'gridTemplateRows', 'gridGap',
        'textAlign', 'lineHeight', 'textTransform',
        'cursor', 'transition', 'animation', 'filter',
        'zIndex', 'opacity', 'transform', 'transformOrigin',
        'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'
    ];

    importantProps.forEach(prop => {
        if (styleObj[prop]) {
            styles[prop] = styleObj[prop];
        }
    });

    // Parse pseudo-classes từ <style> liên quan đến element
    const styleElements = element.ownerDocument.querySelectorAll('style');
    styleElements.forEach(styleEl => {
        const cssContent = styleEl.textContent || styleEl.innerHTML;
        const hoverRegex = new RegExp(`#${element.id}:hover\\s*{([\\s\\S]*?)}`);
        const hoverMatch = cssContent.match(hoverRegex);
        if (hoverMatch) {
            const hoverStyles = {};
            hoverMatch[1].split(';').forEach(rule => {
                const [key, value] = rule.split(':').map(s => s.trim());
                if (key && value) {
                    const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                    hoverStyles[camelKey] = value;
                }
            });
            if (Object.keys(hoverStyles).length > 0) {
                styles[':hover'] = hoverStyles;
            }
        }
    });

    return styles;
};

/**
 * Extract events từ runtime script
 * @param {string} scriptContent - Script content
 * @returns {Array} Array of event configs
 */
const extractEventsFromScript = (scriptContent) => {
    const eventsMatch = scriptContent.match(/const eventsConfig = (\[[\s\S]*?\]);/);
    if (eventsMatch) {
        try {
            return JSON.parse(eventsMatch[1]);
        } catch (e) {
            console.warn('⚠️ Cannot parse events config:', e.message);
            return [];
        }
    }
    return [];
};

/**
 * Ánh xạ events vào elements
 * @param {Array} elements - Array of elements
 * @param {Array} eventsConfig - Array of event configs
 */
const mapEventsToElements = (elements, eventsConfig) => {
    eventsConfig.forEach(eventConfig => {
        const element = findElementById(elements, eventConfig.elementId);
        if (element) {
            if (!element.componentData) {
                element.componentData = {};
            }
            element.componentData.events = eventConfig.events || {};
        }
    });
};

/**
 * Extract animations từ CSS
 * @param {string} cssContent - CSS content
 * @returns {Object} Animations object
 */
const extractAnimationsFromCSS = (cssContent) => {
    const animations = {};
    const keyframesRegex = /@keyframes\s+(\S+)\s*{([\s\S]*?)}/g;
    let match;
    while ((match = keyframesRegex.exec(cssContent))) {
        const keyframeName = match[1];
        const framesContent = match[2];
        const frames = {};
        const frameRegex = /(\d+%|from|to)\s*{([\s\S]*?)}/g;
        let frameMatch;
        while ((frameMatch = frameRegex.exec(framesContent))) {
            const frameKey = frameMatch[1];
            const props = {};
            frameMatch[2].split(';').forEach(rule => {
                const [key, value] = rule.split(':').map(s => s.trim());
                if (key && value) {
                    const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                    props[camelKey] = value;
                }
            });
            frames[frameKey] = props;
        }
        animations[`@keyframes ${keyframeName}`] = frames;
    }
    return animations;
};

/**
 * Ánh xạ animations vào elements
 * @param {Array} elements - Array of elements
 * @param {Object} animations - Animations object
 */
const mapAnimationsToElements = (elements, animations) => {
    elements.forEach(element => {
        if (element.styles?.animation) {
            const animationMatch = element.styles.animation.match(/(\S+)\s*(\d+\.?\d*ms)\s*(\w+)\s*(\d+\.?\d*ms)?\s*(infinite)?/);
            if (animationMatch) {
                element.componentData.animation = {
                    type: animationMatch[1],
                    duration: parseFloat(animationMatch[2]) || 1000,
                    timing: animationMatch[3] || 'ease',
                    delay: parseFloat(animationMatch[4]) || 0,
                    repeat: !!animationMatch[5]
                };
            }
        }
        if (element.styles && animations[`@keyframes ${element.styles.animationName}`]) {
            element.styles[`@keyframes ${element.styles.animationName}`] = animations[`@keyframes ${element.styles.animationName}`];
        }
        if (element.children?.length > 0) {
            mapAnimationsToElements(element.children, animations);
        }
    });
};




/**
 * Suy ra type từ element HTML
 * @param {HTMLElement} element - HTML element
 * @returns {string} Element type
 */
const inferTypeFromElement = (element) => {
    const tagName = element.tagName.toLowerCase();
    const classList = element.classList;

    if (classList.contains('lpb-button') || tagName === 'button') return 'button';
    if (classList.contains('lpb-icon')) return 'icon';
    if (classList.contains('lpb-gallery')) return 'gallery';
    if (classList.contains('lpb-section') || classList.contains('ladi-section')) return 'section';
    if (classList.contains('lpb-popup')) return 'popup';
    if (tagName.match(/^h[1-6]$/)) return 'heading';
    if (tagName === 'p') return 'paragraph';
    if (tagName === 'img') return 'image';
    if (tagName === 'hr') return 'divider';
    if (tagName === 'form') return 'form';
    if (tagName === 'ul' || tagName === 'ol') return 'list';
    return 'container';
};