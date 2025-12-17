import { generateAllFormScripts } from './formSubmissionHandler';

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
            // Generate onclick handler if events exist
            const onClickAttr = componentData.events?.onClick
                ? `onclick="LPB.handleEvent(${JSON.stringify(componentData.events.onClick).replace(/"/g, '&quot;')})"`
                : '';
            return `
                <button
                    ${baseAttrs}
                    ${onClickAttr}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.content || componentData.text || 'Button'}
                </button>
            `;

        case 'heading':
            const HeadingTag = componentData.level || 'h2';
            return `
                <${HeadingTag}
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.content || componentData.text || 'Heading'}
                </${HeadingTag}>
            `;

        case 'paragraph':
            return `
                <p
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.content || componentData.text || 'Paragraph'}
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

        case 'video':
            return `
                <video
                    ${baseAttrs}
                    src="${componentData.src || componentData.videoUrl || ''}"
                    controls="${componentData.controls !== false}"
                    autoplay="${componentData.autoplay === true}"
                    loop="${componentData.loop === true}"
                    muted="${componentData.muted === true}"
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.fallbackText || 'Your browser does not support the video tag.'}
                </video>
            `;

        case 'iframe':
            return `
                <iframe
                    ${baseAttrs}
                    src="${componentData.src || ''}"
                    title="${componentData.title || 'Iframe'}"
                    width="${componentData.width || size.width || '100%'}"
                    height="${componentData.height || size.height || '100%'}"
                    frameborder="${componentData.frameBorder ?? 0}"
                    allow="${componentData.allow || 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'}"
                    allowfullscreen="${componentData.allowFullscreen !== false}"
                    loading="${componentData.loading || 'lazy'}"
                    style="${inlineStyles}; ${positionStyles}"
                ></iframe>
            `;

        case 'divider':
        case 'hr':
            return `
                <hr
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}; border:none; height:${componentData.thickness || '2px'}; background:${componentData.color || '#e5e7eb'};"
                />
            `;

        case 'line':
            const lineWidth = size.width || componentData.size?.width || 100;
            const lineHeight = size.height || componentData.size?.height || 2;
            const lineStrokeWidth = componentData.strokeWidth || styles.strokeWidth || lineHeight;
            const lineStroke = componentData.stroke || styles.stroke || styles.borderColor || '#000';
            const lineStrokeLinecap = componentData.strokeLinecap || styles.strokeLinecap || 'round';
            const svgHeight = Math.max(lineHeight, lineStrokeWidth);
            return `
                <svg
                    ${baseAttrs}
                    width="${lineWidth}"
                    height="${svgHeight}"
                    style="${inlineStyles}; ${positionStyles}; display:block;"
                >
                    <line
                        x1="0"
                        y1="${svgHeight / 2}"
                        x2="${lineWidth}"
                        y2="${svgHeight / 2}"
                        stroke="${lineStroke}"
                        stroke-width="${lineStrokeWidth}"
                        stroke-linecap="${lineStrokeLinecap}"
                    />
                </svg>
            `;

        case 'link':
        case 'anchor':
            return `
                <a
                    ${baseAttrs}
                    href="${componentData.href || componentData.url || '#'}"
                    target="${componentData.newTab || componentData.target === '_blank' ? '_blank' : '_self'}"
                    rel="${componentData.newTab || componentData.target === '_blank' ? 'noopener noreferrer' : ''}"
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${componentData.content || componentData.text || 'Link'}
                </a>
            `;

        case 'form':
            // Render children elements (if any)
            const formChildren = children.map(child => renderElementHTML(child, true)).join('\n');

            // Render configured fields from componentData.fields (form builder style)
            const renderFormFields = (fields) => {
                if (!Array.isArray(fields) || fields.length === 0) return '';

                return fields.map(field => {
                    const fieldId = field.id || `field-${Math.random().toString(36).substr(2, 9)}`;
                    const fieldName = field.name || fieldId;
                    const fieldLabel = field.label || '';
                    const required = field.required || false;
                    const requiredAttr = required ? 'required' : '';
                    const requiredMark = required ? '<span style="color:#ef4444;margin-left:4px;">*</span>' : '';

                    const fieldWrapperStyle = 'margin-bottom:16px; display:flex; flex-direction:column; gap:6px;';
                    const labelStyle = 'font-size:14px; font-weight:500; color:#374151;';
                    const inputStyle = 'width:100%; padding:12px 16px; border-radius:8px; border:1px solid #d1d5db; font-size:16px; outline:none; transition:all 0.3s ease; box-sizing:border-box;';

                    switch (field.type) {
                        case 'text':
                        case 'email':
                        case 'tel':
                        case 'number':
                        case 'date':
                            return `
                                <div class="form-field-wrapper" style="${fieldWrapperStyle}">
                                    ${fieldLabel ? `<label for="${fieldId}" style="${labelStyle}">${fieldLabel}${requiredMark}</label>` : ''}
                                    <input
                                        type="${field.type}"
                                        id="${fieldId}"
                                        name="${fieldName}"
                                        placeholder="${field.placeholder || ''}"
                                        ${requiredAttr}
                                        style="${inputStyle}"
                                    />
                                </div>
                            `;

                        case 'textarea':
                            return `
                                <div class="form-field-wrapper" style="${fieldWrapperStyle}">
                                    ${fieldLabel ? `<label for="${fieldId}" style="${labelStyle}">${fieldLabel}${requiredMark}</label>` : ''}
                                    <textarea
                                        id="${fieldId}"
                                        name="${fieldName}"
                                        rows="${field.rows || 4}"
                                        placeholder="${field.placeholder || ''}"
                                        ${requiredAttr}
                                        style="${inputStyle} resize:vertical; font-family:inherit;"
                                    ></textarea>
                                </div>
                            `;

                        case 'select':
                            const options = Array.isArray(field.options) ? field.options : [];
                            return `
                                <div class="form-field-wrapper" style="${fieldWrapperStyle}">
                                    ${fieldLabel ? `<label for="${fieldId}" style="${labelStyle}">${fieldLabel}${requiredMark}</label>` : ''}
                                    <select
                                        id="${fieldId}"
                                        name="${fieldName}"
                                        ${requiredAttr}
                                        style="${inputStyle} cursor:pointer; background-color:#fff;"
                                    >
                                        ${options.map(opt => `<option value="${opt.value || opt}">${opt.label || opt}</option>`).join('')}
                                    </select>
                                </div>
                            `;

                        case 'checkbox':
                            return `
                                <div class="form-field-wrapper" style="${fieldWrapperStyle}; flex-direction:row; align-items:center; gap:8px;">
                                    <input
                                        type="checkbox"
                                        id="${fieldId}"
                                        name="${fieldName}"
                                        ${requiredAttr}
                                        style="width:18px; height:18px; cursor:pointer;"
                                    />
                                    <label for="${fieldId}" style="font-size:16px; color:#374151; cursor:pointer;">
                                        ${fieldLabel}${requiredMark}
                                    </label>
                                </div>
                            `;

                        case 'radio':
                            const radioOptions = Array.isArray(field.options) ? field.options : [];
                            return `
                                <div class="form-field-wrapper" style="${fieldWrapperStyle}">
                                    ${fieldLabel ? `<label style="${labelStyle}">${fieldLabel}${requiredMark}</label>` : ''}
                                    ${radioOptions.map((opt, idx) => `
                                        <div style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                            <input
                                                type="radio"
                                                id="${fieldId}-${idx}"
                                                name="${fieldName}"
                                                value="${opt.value || opt}"
                                                ${idx === 0 && required ? 'required' : ''}
                                                style="width:18px; height:18px; cursor:pointer;"
                                            />
                                            <label for="${fieldId}-${idx}" style="font-size:16px; color:#374151; cursor:pointer;">
                                                ${opt.label || opt}
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                            `;

                        default:
                            return '';
                    }
                }).join('\n');
            };

            const configuredFields = renderFormFields(componentData.fields);
            const hasFields = configuredFields || formChildren;
            const formContent = configuredFields || formChildren || '<div style="padding:20px; text-align:center; color:#9ca3af; border:2px dashed #e5e7eb; border-radius:8px;"><p>Please configure form fields</p></div>';

            // Form title
            const formTitle = componentData.title ? `
                <h3 style="margin:0 0 20px 0; font-size:24px; font-weight:700; color:#1f2937; text-align:${componentData.titleAlign || 'left'};">
                    ${componentData.title}
                </h3>
            ` : '';

            // Form subtitle/description
            const formDescription = componentData.description ? `
                <p style="margin:0 0 24px 0; font-size:16px; color:#6b7280; line-height:1.5; text-align:${componentData.descriptionAlign || 'left'};">
                    ${componentData.description}
                </p>
            ` : '';

            // Submit button (only if there are fields)
            const submitButton = hasFields ? `
                <button
                    type="submit"
                    class="lpb-form-submit"
                    style="
                        width:${componentData.submitButtonFullWidth !== false ? '100%' : 'auto'};
                        padding:${componentData.submitButtonPadding || '14px 32px'};
                        background:${componentData.submitButtonBackground || '#2563eb'};
                        color:${componentData.submitButtonColor || '#ffffff'};
                        border:${componentData.submitButtonBorder || 'none'};
                        border-radius:${componentData.submitButtonBorderRadius || '8px'};
                        font-size:${componentData.submitButtonFontSize || '16px'};
                        font-weight:${componentData.submitButtonFontWeight || '600'};
                        cursor:pointer;
                        transition:all 0.3s ease;
                        margin-top:8px;
                        box-shadow:0 1px 2px rgba(0,0,0,0.05);
                    "
                    onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';"
                    onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)';"
                >
                    ${componentData.submitButtonText || 'Gửi'}
                </button>
            ` : '';

            // Message containers
            const messageContainers = `
                <div class="lpb-form-messages" style="margin-top:16px;"></div>
            `;

            // Form submission JavaScript
            const formScript = hasFields ? `
                <script>
                (function() {
                    const form = document.getElementById('${id}');
                    if (!form) return;

                    form.addEventListener('submit', async function(e) {
                        e.preventDefault();

                        const submitBtn = form.querySelector('.lpb-form-submit');
                        const messagesContainer = form.querySelector('.lpb-form-messages');

                        // Disable submit button
                        if (submitBtn) {
                            submitBtn.disabled = true;
                            submitBtn.textContent = 'Đang gửi...';
                            submitBtn.style.opacity = '0.6';
                            submitBtn.style.cursor = 'not-allowed';
                        }

                        // Clear previous messages
                        if (messagesContainer) messagesContainer.innerHTML = '';

                        try {
                            // Collect form data
                            const formData = new FormData(form);
                            const data = {};
                            formData.forEach((value, key) => {
                                data[key] = value;
                            });

                            // Get UTM parameters from URL
                            const urlParams = new URLSearchParams(window.location.search);
                            const utmParams = {};
                            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
                                if (urlParams.has(param)) {
                                    utmParams[param] = urlParams.get(param);
                                }
                            });

                            // Detect device type
                            const getDeviceType = () => {
                                const ua = navigator.userAgent;
                                if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
                                if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
                                return 'desktop';
                            };

                            // Prepare submission payload
                            const payload = {
                                page_id: '${element?.page_id || 'unknown'}',
                                form_id: '${id}',
                                form_data: data,
                                metadata: {
                                    referrer: document.referrer || '',
                                    user_agent: navigator.userAgent,
                                    language: navigator.language,
                                    device_type: getDeviceType(),
                                    screen_resolution: window.screen.width + 'x' + window.screen.height,
                                    ...utmParams
                                }
                            };

                            // Get API endpoint (priority: custom config > window config > default backend)
                            const apiEndpoint = '${componentData.apiEndpoint || ''}' ||
                                                (window.LPB_CONFIG && window.LPB_CONFIG.apiUrl) ||
                                                'https://api.landinghub.shop/api/forms/submit';

                            // Submit to backend
                            const response = await fetch(apiEndpoint, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(payload)
                            });

                            const result = await response.json();

                            if (response.ok) {
                                // Success
                                if (messagesContainer) {
                                    messagesContainer.innerHTML = \`
                                        <div style="padding:12px 16px; background:#d1fae5; border:1px solid #10b981; border-radius:8px; color:#065f46; font-size:14px;">
                                            ✓ ${componentData.successMessage || 'Cảm ơn bạn! Chúng tôi đã nhận được thông tin của bạn.'}
                                        </div>
                                    \`;
                                }

                                // Reset form
                                form.reset();

                                // Redirect if configured
                                const redirectUrl = '${componentData.redirectUrl || ''}';
                                if (redirectUrl) {
                                    setTimeout(() => {
                                        window.location.href = redirectUrl;
                                    }, 2000);
                                }
                            } else {
                                throw new Error(result.message || 'Submission failed');
                            }
                        } catch (error) {
                            console.error('Form submission error:', error);
                            if (messagesContainer) {
                                messagesContainer.innerHTML = \`
                                    <div style="padding:12px 16px; background:#fee2e2; border:1px solid #ef4444; border-radius:8px; color:#991b1b; font-size:14px;">
                                        ✗ ${componentData.errorMessage || 'Có lỗi xảy ra. Vui lòng thử lại sau.'}
                                    </div>
                                \`;
                            }
                        } finally {
                            // Re-enable submit button
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.textContent = '${componentData.submitButtonText || 'Gửi'}';
                                submitBtn.style.opacity = '1';
                                submitBtn.style.cursor = 'pointer';
                            }
                        }
                    });
                })();
                </script>
            ` : '';

            return `
                <form
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                    class="lpb-form"
                    novalidate
                >
                    ${formTitle}
                    ${formDescription}
                    ${formContent}
                    ${submitButton}
                    ${messageContainers}
                </form>
                ${formScript}
            `;

        case 'input':
            return `
                <input
                    ${baseAttrs}
                    type="${componentData.inputType || 'text'}"
                    name="${componentData.name || id}"
                    placeholder="${componentData.placeholder || ''}"
                    value="${componentData.value || ''}"
                    required="${componentData.required === true}"
                    style="${inlineStyles}; ${positionStyles}"
                />
            `;

        case 'textarea':
            return `
                <textarea
                    ${baseAttrs}
                    name="${componentData.name || id}"
                    placeholder="${componentData.placeholder || ''}"
                    rows="${componentData.rows || 4}"
                    required="${componentData.required === true}"
                    style="${inlineStyles}; ${positionStyles}"
                >${componentData.value || ''}</textarea>
            `;

        case 'container':
        case 'div':
            const containerChildren = children.map(child => renderElementHTML(child, true)).join('\n');
            return `
                <div
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${containerChildren || componentData.content || ''}
                </div>
            `;

        // Shape Components
        case 'square':
            const squareWidth = size.width || componentData.size?.width || 50;
            const squareHeight = size.height || componentData.size?.height || 50;
            const squareFill = componentData.fill || styles.fill || styles.background || '#000';
            const squareStroke = componentData.stroke || styles.stroke || styles.borderColor || 'currentColor';
            const squareStrokeWidth = componentData.strokeWidth || styles.strokeWidth || styles.borderWidth || 2;
            return `
                <svg
                    ${baseAttrs}
                    width="${squareWidth}"
                    height="${squareHeight}"
                    style="${inlineStyles}; ${positionStyles}"
                    viewBox="0 0 ${squareWidth} ${squareHeight}"
                    preserveAspectRatio="none"
                >
                    <rect
                        x="0"
                        y="0"
                        width="${squareWidth}"
                        height="${squareHeight}"
                        fill="${squareFill}"
                        stroke="${squareStroke}"
                        stroke-width="${squareStrokeWidth}"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            `;

        case 'star':
            const starWidth = size.width || componentData.size?.width || 50;
            const starHeight = size.height || componentData.size?.height || 50;
            const starFill = componentData.fill || styles.fill || styles.background || '#000';
            const starStroke = componentData.stroke || styles.stroke || styles.borderColor || 'currentColor';
            const starStrokeWidth = componentData.strokeWidth || styles.strokeWidth || styles.borderWidth || 2;
            // Scale the star path to fit the size
            const starPath = `M${starWidth/2} ${starHeight*0.1} L${starWidth*0.64} ${starHeight*0.36} H${starWidth*0.96} L${starWidth*0.72} ${starHeight*0.58} L${starWidth*0.82} ${starHeight*0.88} L${starWidth/2} ${starHeight*0.72} L${starWidth*0.18} ${starHeight*0.88} L${starWidth*0.28} ${starHeight*0.58} L${starWidth*0.04} ${starHeight*0.36} H${starWidth*0.36} Z`;
            return `
                <svg
                    ${baseAttrs}
                    width="${starWidth}"
                    height="${starHeight}"
                    style="${inlineStyles}; ${positionStyles}"
                    viewBox="0 0 ${starWidth} ${starHeight}"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <path
                        d="${starPath}"
                        fill="${starFill}"
                        stroke="${starStroke}"
                        stroke-width="${starStrokeWidth}"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            `;

        case 'layoutgrid':
            const gridChildren = children.map(child => renderElementHTML(child, true)).join('\n');
            const gridColumns = componentData.columns ? `repeat(${componentData.columns}, 1fr)` : (styles.gridTemplateColumns || 'repeat(2, 1fr)');
            const gridGap = componentData.gap || styles.gap || '20px';
            const gridPadding = componentData.padding || styles.padding || '10px';
            const gridBackground = componentData.background || styles.background || 'transparent';
            return `
                <div
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}; display: grid; grid-template-columns: ${gridColumns}; gap: ${gridGap}; padding: ${gridPadding}; background: ${gridBackground};"
                >
                    ${gridChildren || '<p>Empty grid</p>'}
                </div>
            `;

        // Advanced Components - HTML Export
        case 'countdown':
            return `
                <div ${baseAttrs} data-countdown="${componentData.targetDate || ''}" style="${inlineStyles}; ${positionStyles}" class="lpb-countdown">
                    <div class="countdown-timer" id="timer-${id}"></div>
                    <script>
                        (function() {
                            const target = new Date('${componentData.targetDate}').getTime();
                            const el = document.getElementById('timer-${id}');
                            const labels = ${JSON.stringify(componentData.labels || {})};
                            setInterval(() => {
                                const now = new Date().getTime();
                                const diff = target - now;
                                if (diff < 0) { el.innerHTML = 'Đã kết thúc'; return; }
                                const d = Math.floor(diff / (1000*60*60*24));
                                const h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
                                const m = Math.floor((diff % (1000*60*60)) / (1000*60));
                                const s = Math.floor((diff % (1000*60)) / 1000);
                                el.innerHTML = \`<div>\${d}<br><small>\${labels.days || 'Days'}</small></div><div>\${h}<br><small>\${labels.hours || 'Hours'}</small></div><div>\${m}<br><small>\${labels.minutes || 'Mins'}</small></div><div>\${s}<br><small>\${labels.seconds || 'Secs'}</small></div>\`;
                            }, 1000);
                        })();
                    </script>
                </div>
            `;

        case 'carousel':
            const carouselId = `carousel-${id}`;
            const items = componentData.items || [];
            return `
                <div ${baseAttrs} style="${inlineStyles}; ${positionStyles}; position: relative; overflow: hidden;" class="lpb-carousel">
                    ${componentData.title ? `<h3 style="text-align: center; margin-bottom: 20px;">${componentData.title}</h3>` : ''}
                    <div id="${carouselId}" class="carousel-container" style="display: flex; width: 100%; overflow: hidden;">
                        ${items.map((item, idx) => `
                            <div class="carousel-item" style="min-width: 100%; display: ${idx === 0 ? 'block' : 'none'}; padding: 20px; text-align: center;">
                                ${item.image ? `<img src="${item.image}" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px;" alt="${item.name || ''}" />` : ''}
                                ${item.name ? `<h4 style="margin: 8px 0; font-size: 1.25rem;">${item.name}</h4>` : ''}
                                ${item.role ? `<p style="color: #6b7280; margin: 4px 0;">${item.role}</p>` : ''}
                                ${item.text || item.content ? `<p style="margin-top: 12px;">${item.text || item.content}</p>` : ''}
                                ${item.rating ? `<div style="color: #fbbf24; margin-top: 8px;">${'★'.repeat(Math.floor(item.rating))}${'☆'.repeat(5 - Math.floor(item.rating))}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    ${items.length > 1 ? `
                        <button onclick="carouselPrev('${carouselId}')" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 50%; z-index: 10;">‹</button>
                        <button onclick="carouselNext('${carouselId}')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 50%; z-index: 10;">›</button>
                    ` : ''}
                    <script>
                        if (!window.carouselIndexes) window.carouselIndexes = {};
                        window.carouselIndexes['${carouselId}'] = 0;
                        window.carouselPrev = function(id) {
                            const items = document.querySelectorAll('#' + id + ' .carousel-item');
                            items[window.carouselIndexes[id]].style.display = 'none';
                            window.carouselIndexes[id] = (window.carouselIndexes[id] - 1 + items.length) % items.length;
                            items[window.carouselIndexes[id]].style.display = 'block';
                        };
                        window.carouselNext = function(id) {
                            const items = document.querySelectorAll('#' + id + ' .carousel-item');
                            items[window.carouselIndexes[id]].style.display = 'none';
                            window.carouselIndexes[id] = (window.carouselIndexes[id] + 1) % items.length;
                            items[window.carouselIndexes[id]].style.display = 'block';
                        };
                    </script>
                </div>
            `;

        case 'accordion':
            const accordionItems = componentData.items || [];
            return `
                <div ${baseAttrs} style="${inlineStyles}; ${positionStyles}" class="lpb-accordion">
                    ${componentData.title ? `<h3 style="margin-bottom: 20px; font-size: 1.5rem; font-weight: 700;">${componentData.title}</h3>` : ''}
                    ${accordionItems.map((item, idx) => `
                        <div style="margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                            <button onclick="toggleAccordion('${id}-${idx}')" style="width: 100%; padding: 16px; background: #ffffff; border: none; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 1rem; font-weight: 600;">
                                <span>${item.question || item.title}</span>
                                <span id="${id}-${idx}-icon">▼</span>
                            </button>
                            <div id="${id}-${idx}" style="display: ${idx === 0 ? 'block' : 'none'}; padding: 16px; background: #f9fafb; color: #6b7280;">
                                ${item.answer || item.content}
                            </div>
                        </div>
                    `).join('')}
                    <script>
                        window.toggleAccordion = function(id) {
                            const content = document.getElementById(id);
                            const icon = document.getElementById(id + '-icon');
                            if (content.style.display === 'none') {
                                content.style.display = 'block';
                                icon.innerText = '▲';
                            } else {
                                content.style.display = 'none';
                                icon.innerText = '▼';
                            }
                        };
                    </script>
                </div>
            `;

        case 'tabs':
            const tabs = componentData.tabs || [];
            return `
                <div ${baseAttrs} style="${inlineStyles}; ${positionStyles}" class="lpb-tabs">
                    ${componentData.title ? `<h3 style="margin-bottom: 20px; font-size: 1.5rem; font-weight: 700; text-align: center;">${componentData.title}</h3>` : ''}
                    <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb;">
                        ${tabs.map((tab, idx) => `
                            <button onclick="switchTab('${id}', ${idx})" id="${id}-tab-${idx}" style="padding: 12px 24px; background: transparent; border: none; border-bottom: 2px solid ${idx === 0 ? '#3b82f6' : 'transparent'}; color: ${idx === 0 ? '#3b82f6' : '#6b7280'}; font-weight: ${idx === 0 ? '600' : '400'}; cursor: pointer; margin-bottom: -2px;">
                                ${tab.label}
                            </button>
                        `).join('')}
                    </div>
                    ${tabs.map((tab, idx) => `
                        <div id="${id}-content-${idx}" style="display: ${idx === 0 ? 'block' : 'none'}; text-align: center;">
                            ${tab.content ? `
                                <div style="font-size: 2.5rem; font-weight: 700; color: #1f2937; margin-bottom: 8px;">
                                    ${tab.content.price || ''}
                                    ${tab.content.period ? `<span style="font-size: 1rem; font-weight: 400; color: #6b7280;">/${tab.content.period}</span>` : ''}
                                </div>
                                ${tab.content.features ? `<ul style="list-style: none; padding: 0; margin-top: 20px;">
                                    ${tab.content.features.map(f => `<li style="padding: 8px 0; color: #374151;">✓ ${f}</li>`).join('')}
                                </ul>` : ''}
                            ` : tab.text || ''}
                        </div>
                    `).join('')}
                    <script>
                        window.switchTab = function(id, index) {
                            const tabs = document.querySelectorAll('[id^="' + id + '-tab-"]');
                            const contents = document.querySelectorAll('[id^="' + id + '-content-"]');
                            tabs.forEach((tab, i) => {
                                tab.style.borderBottomColor = i === index ? '#3b82f6' : 'transparent';
                                tab.style.color = i === index ? '#3b82f6' : '#6b7280';
                                tab.style.fontWeight = i === index ? '600' : '400';
                            });
                            contents.forEach((content, i) => {
                                content.style.display = i === index ? 'block' : 'none';
                            });
                        };
                    </script>
                </div>
            `;

        case 'progress':
            const progressItems = componentData.items || [];
            return `
                <div ${baseAttrs} style="${inlineStyles}; ${positionStyles}" class="lpb-progress">
                    ${componentData.title ? `<h3 style="margin-bottom: 20px; font-size: 1.5rem; font-weight: 700;">${componentData.title}</h3>` : ''}
                    ${progressItems.map(item => `
                        <div style="margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-weight: 600; color: #374151;">${item.label}</span>
                                ${componentData.showPercentage !== false ? `<span style="color: #6b7280;">${item.value}%</span>` : ''}
                            </div>
                            <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${item.value}%; height: 100%; background: ${item.color || '#3b82f6'}; border-radius: 4px; transition: width 1s ease-out;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

        case 'rating':
            const rating = componentData.rating || 0;
            const maxRating = componentData.maxRating || 5;
            const reviews = componentData.reviews || 0;
            return `
                <div ${baseAttrs} style="${inlineStyles}; ${positionStyles}; display: flex; align-items: center; gap: 8px;" class="lpb-rating">
                    <div style="display: flex; gap: 4px;">
                        ${Array.from({length: maxRating}, (_, i) => {
                            const filled = i < Math.floor(rating);
                            return `<span style="color: ${filled ? (componentData.color || '#fbbf24') : '#d1d5db'}; font-size: 24px;">${filled ? '★' : '☆'}</span>`;
                        }).join('')}
                    </div>
                    <span style="font-weight: 600; font-size: 1.125rem;">${rating.toFixed(1)}</span>
                    ${componentData.showReviews !== false ? `<span style="color: #6b7280;">(${reviews} đánh giá)</span>` : ''}
                </div>
            `;

        case 'social-proof':
            const notifications = componentData.notifications || [];
            const notificationId = `notification-${id}`;
            return `
                <div ${baseAttrs} style="${inlineStyles}; ${positionStyles};" class="lpb-social-proof">
                    <div id="${notificationId}" style="background: #ffffff; border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img id="${notificationId}-avatar" src="" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" alt="Avatar" />
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                                    <span id="${notificationId}-name"></span> <span id="${notificationId}-action"></span>
                                </div>
                                <div style="font-size: 0.875rem; color: #6b7280;">
                                    <span id="${notificationId}-product"></span> • <span id="${notificationId}-time"></span>
                                </div>
                            </div>
                            <button onclick="closeSocialProof('${notificationId}')" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 1.25rem; padding: 0; width: 24px; height: 24px;">×</button>
                        </div>
                    </div>
                    <script>
                        (function() {
                            const notifications = ${JSON.stringify(notifications)};
                            const interval = ${componentData.interval || 5000};
                            let currentIndex = 0;
                            const el = document.getElementById('${notificationId}');

                            function showNotification() {
                                if (notifications.length === 0) return;
                                const notif = notifications[currentIndex];
                                document.getElementById('${notificationId}-avatar').src = notif.avatar || 'https://i.pravatar.cc/50';
                                document.getElementById('${notificationId}-name').innerText = notif.name || 'Khách hàng';
                                document.getElementById('${notificationId}-action').innerText = notif.action || 'vừa mua';
                                document.getElementById('${notificationId}-product').innerText = notif.product || 'Sản phẩm';
                                document.getElementById('${notificationId}-time').innerText = notif.time || '1 phút trước';
                                el.style.display = 'block';

                                setTimeout(() => {
                                    el.style.display = 'none';
                                }, 4000);

                                currentIndex = (currentIndex + 1) % notifications.length;
                            }

                            window.closeSocialProof = function(id) {
                                document.getElementById(id).style.display = 'none';
                            };

                            // Show first notification after 2s
                            setTimeout(showNotification, 2000);
                            // Then show every interval
                            setInterval(showNotification, interval);
                        })();
                    </script>
                </div>
            `;

        case 'social-proof-stats':
            const stats = componentData.stats || [];
            return `
                <div ${baseAttrs} style="${inlineStyles}; ${positionStyles}; display: grid; grid-template-columns: repeat(${Math.min(stats.length, 4)}, 1fr); gap: 20px;" class="lpb-social-proof-stats">
                    ${stats.map(stat => `
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 2.5rem; margin-bottom: 8px;">${stat.icon || '📊'}</div>
                            <div style="font-size: 2rem; font-weight: 700; color: #1f2937; margin-bottom: 4px;">${stat.value}</div>
                            <div style="font-size: 0.875rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">${stat.label}</div>
                        </div>
                    `).join('')}
                    <style>
                        @media (max-width: 768px) {
                            .lpb-social-proof-stats {
                                grid-template-columns: repeat(2, 1fr) !important;
                            }
                        }
                    </style>
                </div>
            `;

        default:
            // Default fallback for unknown element types
            const defaultChildren = children.length > 0
                ? children.map(child => renderElementHTML(child, true)).join('\n')
                : (componentData.content || componentData.text || `[${type}]`);
            return `
                <div
                    ${baseAttrs}
                    style="${inlineStyles}; ${positionStyles}"
                >
                    ${defaultChildren}
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
/**
 * Render section với children – Phiên bản đã sửa lỗi background-image
 */
const renderSectionHTML = (section) => {
    const {
        id,
        componentData = {},
        styles = {},
        size = {},
        position = {},
        children = []
    } = section;

    // Render children
    const childrenHTML = children
        .map(child => renderElementHTML(child, true))
        .join('\n');

    // === XỬ LÝ BACKGROUND IMAGE AN TOÀN ===
    let backgroundImageStyle = 'none';
    let backgroundSize = componentData.backgroundSize || 'cover';
    let backgroundPosition = componentData.backgroundPosition || 'center';

    if (componentData.backgroundImage) {
        let cleanUrl = componentData.backgroundImage.trim();

        // Loại bỏ wrapper url(...) nếu đã có (tránh double url())
        const urlMatch = cleanUrl.match(/url\(['"]?([^'"]+)['"]?\)/i);
        if (urlMatch) {
            cleanUrl = urlMatch[1];
        }

        // Escape dấu ngoặc kép trong URL nếu cần (an toàn cho inline style)
        backgroundImageStyle = `url("${cleanUrl}")`;
    }

    // Nếu có backgroundColor riêng (không bắt buộc phải có backgroundImage)
    const backgroundColor = componentData.backgroundColor || styles.backgroundColor || 'transparent';

    // Overlay
    const overlayColor = componentData.overlayColor || 'transparent';
    const overlayOpacity = componentData.overlayOpacity ?? 0;

    // Padding cho container
    const containerPadding = componentData.padding || styles.padding || '20px';

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
                overflow: hidden;
            "
        >
            <!-- Background -->
            <div class="ladi-section-background" style="
                position: absolute;
                inset: 0;
                z-index: 0;
                background-color: ${backgroundColor};
                background-image: ${backgroundImageStyle};
                background-size: ${backgroundSize};
                background-position: ${backgroundPosition};
                background-repeat: no-repeat;
            "></div>

            <!-- Overlay -->
            <div class="ladi-overlay" style="
                position: absolute;
                inset: 0;
                z-index: 1;
                background-color: ${overlayColor};
                opacity: ${overlayOpacity};
                pointer-events: none;
            "></div>

            <!-- Container -->
            <div class="ladi-container" style="
                position: relative;
                z-index: 2;
                padding: ${containerPadding};
                width: 100%;
                height: 100%;
                box-sizing: border-box;
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

        html {
            scroll-behavior: smooth;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .lpb-element {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Base responsive images */
        .lpb-element img {
            max-width: 100%;
            height: auto;
            display: block;
        }

        /* Smooth scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #f1f5f9;
        }

        ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #5568d3, #6a3e8f);
        }

        /* Section smooth rendering */
        .ladi-section {
            transition: background-color 0.3s ease, background-image 0.3s ease;
        }

        .ladi-container {
            transition: padding 0.2s ease;
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
        // Apply responsive styles for all element types
        if (element.responsiveStyles?.tablet) {
            css += `\n    #${element.id} {`;
            Object.entries(element.responsiveStyles.tablet).forEach(([key, value]) => {
                const kebabKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
                css += `${kebabKey}:${value};`;
            });
            css += `}`;
        }

        // Apply responsive sizing for tablet
        if (element.tabletSize) {
            css += `\n    #${element.id} { width: ${element.tabletSize.width}px; height: ${element.tabletSize.height}px; }`;
        }

        if (element.type === 'section') {
            css += `\n    #${element.id} { top: var(--tablet-y-${element.id}, ${element.position?.tablet?.y || element.position?.desktop?.y || 0}px); }`;

            // Process children positioning
            if (element.children) {
                element.children.forEach(child => {
                    const tabletX = child.position?.tablet?.x || child.position?.desktop?.x || 0;
                    const tabletY = child.position?.tablet?.y || child.position?.desktop?.y || 0;
                    css += `\n    #${child.id} { left: ${tabletX}px; top: ${tabletY}px; }`;

                    // Apply child responsive styles
                    if (child.responsiveStyles?.tablet) {
                        css += `\n    #${child.id} {`;
                        Object.entries(child.responsiveStyles.tablet).forEach(([key, value]) => {
                            const kebabKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
                            css += `${kebabKey}:${value};`;
                        });
                        css += `}`;
                    }
                });
            }
        }
    });

    css += `\n}`;

    // Generate responsive positioning CSS for mobile
    css += `\n\n/* Responsive Mobile (≤480px) */`;
    css += `\n@media (max-width: 480px) {`;

    pageData.elements.forEach(element => {
        // Apply responsive styles for all element types
        if (element.responsiveStyles?.mobile) {
            css += `\n    #${element.id} {`;
            Object.entries(element.responsiveStyles.mobile).forEach(([key, value]) => {
                const kebabKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
                css += `${kebabKey}:${value};`;
            });
            css += `}`;
        }

        // Apply responsive sizing for mobile
        if (element.mobileSize) {
            css += `\n    #${element.id} { width: ${element.mobileSize.width}px; height: ${element.mobileSize.height}px; }`;
        }

        if (element.type === 'section') {
            css += `\n    #${element.id} { top: var(--mobile-y-${element.id}, ${element.position?.mobile?.y || element.position?.desktop?.y || 0}px); }`;

            // Process children positioning
            if (element.children) {
                element.children.forEach(child => {
                    const mobileX = child.position?.mobile?.x || child.position?.desktop?.x || 0;
                    const mobileY = child.position?.mobile?.y || child.position?.desktop?.y || 0;
                    css += `\n    #${child.id} { left: ${mobileX}px; top: ${mobileY}px; }`;

                    // Apply child responsive styles
                    if (child.responsiveStyles?.mobile) {
                        css += `\n    #${child.id} {`;
                        Object.entries(child.responsiveStyles.mobile).forEach(([key, value]) => {
                            const kebabKey = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
                            css += `${kebabKey}:${value};`;
                        });
                        css += `}`;
                    }
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

    // Generate form submission scripts
    const formScripts = generateAllFormScripts(pageData);

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

        /* Mobile (≤768px) - Builder Compatible Layout */
        @media (max-width: 768px) {
            html, body {
                width: 100% !important;
                max-width: 100vw !important;
                overflow-x: hidden !important;
            }

            #lpb-canvas {
                width: 100% !important;
                max-width: 100% !important;
            }

            .lpb-section {
                position: absolute !important;
                width: 100% !important;
                max-width: 100% !important;
                left: 0 !important;
                right: 0 !important;
                transform: none !important;
                margin: 0 !important;
            }

            /* Apply mobile Y positions to sections */
            ${pageData.elements.filter(el => el.type === 'section').map(section => {
                const mobileY = section.position?.mobile?.y || section.position?.desktop?.y || 0;
                const mobileHeight = section.mobileSize?.height || section.size?.height;
                let css = `
            .lpb-section#${section.id} {
                top: ${mobileY}px !important;
                ${mobileHeight ? `height: ${mobileHeight}px !important; min-height: ${mobileHeight}px !important;` : ''}
            }`;

                // Add child element mobile positions
                if (section.children && section.children.length > 0) {
                    section.children.forEach(child => {
                        const mobileX = child.position?.mobile?.x || child.position?.desktop?.x || 0;
                        const mobileY = child.position?.mobile?.y || child.position?.desktop?.y || 0;
                        const mobileWidth = child.mobileSize?.width || child.size?.width;
                        const mobileHeight = child.mobileSize?.height || child.size?.height;

                        css += `
            #${child.id} {
                position: absolute !important;
                left: ${mobileX}px !important;
                top: ${mobileY}px !important;
                ${mobileWidth ? `width: ${mobileWidth}px !important;` : ''}
                ${mobileHeight ? `height: ${mobileHeight}px !important;` : ''}
            }`;
                    });
                }

                return css;
            }).join('')}

            .ladi-container {
                padding: 16px !important;
                width: 100% !important;
            }

            .lpb-popup-container {
                width: 90% !important;
                max-width: 90vw !important;
                min-height: auto !important;
            }

            .lpb-popup-body {
                padding: 16px !important;
            }

            /* Force text wrapping on mobile */
            .lpb-heading, .lpb-paragraph, .lpb-button, .lpb-element {
                max-width: 100% !important;
                word-wrap: break-word !important;
            }

            /* Responsive images */
            .lpb-image img, .lpb-element img {
                max-width: 100% !important;
                height: auto !important;
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

            /* Scale down icons on mobile */
            .lpb-icon {
                max-width: 48px !important;
                max-height: 48px !important;
            }

            .lpb-icon i {
                font-size: 24px !important;
            }

            .lpb-icon img, .lpb-icon svg {
                max-width: 48px !important;
                max-height: 48px !important;
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

            /* Smaller icons on small mobile */
            .lpb-icon {
                max-width: 40px !important;
                max-height: 40px !important;
            }

            .lpb-icon i {
                font-size: 20px !important;
            }

            .lpb-icon img, .lpb-icon svg {
                max-width: 40px !important;
                max-height: 40px !important;
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

            /* Reduce icon sizes for very small screens */
            .lpb-icon {
                max-width: 32px !important;
                max-height: 32px !important;
            }

            .lpb-icon i {
                font-size: 16px !important;
            }

            .lpb-icon img, .lpb-icon svg {
                max-width: 32px !important;
                max-height: 32px !important;
            }
        }

        /* ========== FORM CSS ISOLATION ========== */
        /* Reset và isolate form elements khỏi system CSS */
        .lpb-form, .lpb-element form {
            all: unset;
            display: block;
            width: 100%;
            box-sizing: border-box;
        }

        .lpb-form *, .lpb-element form * {
            box-sizing: border-box;
        }

        .lpb-form input,
        .lpb-form textarea,
        .lpb-form select,
        .lpb-element form input,
        .lpb-element form textarea,
        .lpb-element form select {
            all: unset;
            display: block;
            width: 100%;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            background: #ffffff;
            color: #1f2937;
            transition: all 0.2s ease;
            box-sizing: border-box;
        }

        .lpb-form input:focus,
        .lpb-form textarea:focus,
        .lpb-form select:focus,
        .lpb-element form input:focus,
        .lpb-element form textarea:focus,
        .lpb-element form select:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 0;
            border-color: #3b82f6;
        }

        .lpb-form input::placeholder,
        .lpb-form textarea::placeholder,
        .lpb-element form input::placeholder,
        .lpb-element form textarea::placeholder {
            color: #9ca3af;
        }

        .lpb-form textarea {
            resize: vertical;
            min-height: 80px;
        }

        .lpb-form label,
        .lpb-element form label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
        }

        .lpb-form button[type="submit"],
        .lpb-element form button[type="submit"] {
            all: unset;
            display: inline-block;
            padding: 12px 24px;
            background: #3b82f6;
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s ease;
            box-sizing: border-box;
        }

        .lpb-form button[type="submit"]:hover,
        .lpb-element form button[type="submit"]:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .lpb-form input[type="checkbox"],
        .lpb-form input[type="radio"],
        .lpb-element form input[type="checkbox"],
        .lpb-element form input[type="radio"] {
            all: unset;
            display: inline-block;
            width: auto;
            min-width: 18px;
            min-height: 18px;
            border: 2px solid #d1d5db;
            margin-right: 8px;
            cursor: pointer;
            vertical-align: middle;
        }

        .lpb-form input[type="checkbox"] {
            border-radius: 4px;
        }

        .lpb-form input[type="radio"] {
            border-radius: 50%;
        }

        .lpb-form input[type="checkbox"]:checked,
        .lpb-form input[type="radio"]:checked,
        .lpb-element form input[type="checkbox"]:checked,
        .lpb-element form input[type="radio"]:checked {
            background: #3b82f6;
            border-color: #3b82f6;
        }

        .lpb-form select {
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
        }

        .lpb-form .form-field-wrapper {
            margin-bottom: 16px;
        }

        /* Mobile form styles */
        @media (max-width: 768px) {
            .lpb-form input,
            .lpb-form textarea,
            .lpb-form select,
            .lpb-element form input,
            .lpb-element form textarea,
            .lpb-element form select {
                font-size: 16px !important; /* Prevent zoom on iOS */
                padding: 14px !important;
            }

            .lpb-form button[type="submit"],
            .lpb-element form button[type="submit"] {
                width: 100%;
                padding: 14px 24px !important;
            }
        }
    </style>

    <!-- Landing Page Builder Configuration -->
    <script>
        window.LPB_CONFIG = {
            apiUrl: '${process.env.REACT_APP_API_URL || 'https://api.landinghub.shop'}/api/forms/submit',
            pageId: '${pageData._id || pageData.id || ''}',
            environment: '${process.env.NODE_ENV || 'production'}'
        };
    </script>
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

    <!-- Form Submission Scripts -->
    ${formScripts.join('\n')}

    <!-- Embedded PageData for easy import -->
    <script type="application/json" id="lpb-page-data">
${JSON.stringify(pageData, null, 2)}
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
            componentData.text = componentData.content;
            componentData.background = element.style.background || element.style.backgroundColor;
            componentData.color = element.style.color;
            componentData.borderRadius = element.style.borderRadius;
            componentData.border = element.style.border;
            componentData.fontSize = element.style.fontSize;
            componentData.fontWeight = element.style.fontWeight;
            break;

        case 'heading':
            componentData.content = element.textContent.trim() || 'Heading';
            componentData.text = componentData.content;
            componentData.level = element.tagName.toLowerCase();
            componentData.fontSize = element.style.fontSize;
            componentData.color = element.style.color;
            componentData.fontWeight = element.style.fontWeight;
            componentData.textAlign = element.style.textAlign;
            break;

        case 'paragraph':
            componentData.content = element.textContent.trim() || 'Paragraph';
            componentData.text = componentData.content;
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

        case 'video':
            componentData.src = element.getAttribute('src') || '';
            componentData.videoUrl = componentData.src;
            componentData.controls = element.hasAttribute('controls');
            componentData.autoplay = element.hasAttribute('autoplay');
            componentData.loop = element.hasAttribute('loop');
            componentData.muted = element.hasAttribute('muted');
            componentData.fallbackText = element.textContent.trim();
            break;

        case 'iframe':
            componentData.src = element.getAttribute('src') || '';
            componentData.title = element.getAttribute('title') || 'Iframe';
            componentData.width = element.getAttribute('width') || '100%';
            componentData.height = element.getAttribute('height') || '100%';
            componentData.frameBorder = parseInt(element.getAttribute('frameborder')) || 0;
            componentData.allow = element.getAttribute('allow') || 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            componentData.allowFullscreen = element.hasAttribute('allowfullscreen');
            componentData.loading = element.getAttribute('loading') || 'lazy';
            break;

        case 'divider':
        case 'hr':
            componentData.thickness = element.style.height || '2px';
            componentData.color = element.style.background || element.style.backgroundColor || '#e5e7eb';
            break;

        case 'link':
        case 'anchor':
            componentData.content = element.textContent.trim() || 'Link';
            componentData.text = componentData.content;
            componentData.href = element.getAttribute('href') || '#';
            componentData.url = componentData.href;
            componentData.target = element.getAttribute('target');
            componentData.newTab = componentData.target === '_blank';
            break;

        case 'form':
            componentData.action = element.getAttribute('action') || '#';
            componentData.method = element.getAttribute('method') || 'POST';
            break;

        case 'input':
            componentData.inputType = element.getAttribute('type') || 'text';
            componentData.name = element.getAttribute('name') || '';
            componentData.placeholder = element.getAttribute('placeholder') || '';
            componentData.value = element.getAttribute('value') || '';
            componentData.required = element.hasAttribute('required');
            break;

        case 'textarea':
            componentData.name = element.getAttribute('name') || '';
            componentData.placeholder = element.getAttribute('placeholder') || '';
            componentData.value = element.textContent.trim();
            componentData.rows = element.getAttribute('rows') || 4;
            componentData.required = element.hasAttribute('required');
            break;

        case 'container':
        case 'div':
            componentData.content = element.innerHTML || '';
            break;

        default:
            componentData.content = element.textContent.trim() || '';
            componentData.text = componentData.content;
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

    // Check by class first (more specific)
    if (classList.contains('lpb-button')) return 'button';
    if (classList.contains('lpb-icon')) return 'icon';
    if (classList.contains('lpb-gallery')) return 'gallery';
    if (classList.contains('lpb-section') || classList.contains('ladi-section')) return 'section';
    if (classList.contains('lpb-popup')) return 'popup';
    if (classList.contains('lpb-video')) return 'video';
    if (classList.contains('lpb-divider')) return 'divider';
    if (classList.contains('lpb-link')) return 'link';
    if (classList.contains('lpb-container')) return 'container';
    if (classList.contains('lpb-form')) return 'form';
    if (classList.contains('lpb-input')) return 'input';
    if (classList.contains('lpb-textarea')) return 'textarea';

    // Then check by tag name
    if (tagName === 'button') return 'button';
    if (tagName.match(/^h[1-6]$/)) return 'heading';
    if (tagName === 'p') return 'paragraph';
    if (tagName === 'img') return 'image';
    if (tagName === 'hr') return 'divider';
    if (tagName === 'video') return 'video';
    if (tagName === 'a') return 'link';
    if (tagName === 'form') return 'form';
    if (tagName === 'input') return 'input';
    if (tagName === 'textarea') return 'textarea';
    if (tagName === 'ul' || tagName === 'ol') return 'list';

    // Default
    return 'container';
};