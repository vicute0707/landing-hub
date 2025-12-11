import React, { useState } from 'react';
import { Smartphone, Tablet, Monitor, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { syncAllElements, initializeResponsiveData } from '../../utils/responsiveSync';
import { toast } from 'react-toastify';
import styled from 'styled-components';

const ToolbarWrapper = styled.div`
    display: flex;
    margin-top: 60px;
    gap: 12px;
    align-items: center;
    padding: 8px;
    background: #f3f4f6;
    border-bottom: 1px solid #e5e7eb;
    justify-content: center;
    flex-wrap: wrap;
`;

const ViewModeButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: ${props => props.isActive ? '#ffffff' : 'transparent'};
    color: ${props => props.isActive ? props.color : '#6b7280'};
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: ${props => props.isActive ? '600' : '500'};
    transition: all 0.2s ease;
    box-shadow: ${props => props.isActive ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'};

    &:hover {
        background: ${props => props.isActive ? '#ffffff' : '#e5e7eb'};
    }

    span.label {
        @media (max-width: 767px) {
            display: none;
        }
        @media (min-width: 768px) {
            display: inline;
        }
    }
`;

const WidthBadge = styled.span`
    font-size: 10px;
    opacity: 0.7;
    background: ${props => props.isActive ? props.color : '#9ca3af'};
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
`;

const StatusWrapper = styled.div`
    display: flex;
    gap: 8px;
    padding-left: 12px;
    border-left: 2px solid #e5e7eb;
    align-items: center;
`;

const InitButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

    &:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    }
`;

const SyncButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #3b82f6;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;

    &:hover {
        background: #2563eb;
        transform: scale(1.02);
    }
`;

const StatusBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #d1fae5;
    color: #065f46;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
`;

const Tooltip = styled.div`
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: #ffffff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: fadeIn 0.2s ease;
    pointer-events: none;

    &::before {
        content: '';
        position: absolute;
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 4px solid #1f2937;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-5px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;

const InfoBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 12px;
    border-left: 2px solid #e5e7eb;

    span {
        font-size: 11px;
        color: #6b7280;
        font-weight: 500;

        .current-width {
            margin-left: 6px;
            padding: 3px 8px;
            background: #f3f4f6;
            border-radius: 6px;
            font-weight: 600;
            color: #374151;
        }
    }
`;

const ResponsiveToolbar = ({
                               viewMode,
                               onViewModeChange,
                               pageData,
                               onUpdatePageData
                           }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    // Enhanced responsive status check
    const checkResponsiveStatus = () => {
        if (!pageData?.elements || pageData.elements.length === 0) {
            return { initialized: true, needsSync: false };
        }

        let initialized = true;
        let needsSync = false;

        pageData.elements.forEach(element => {
            // Check positions and sizes for all modes
            if (!element.position?.mobile || !element.position?.tablet ||
                !element.size || !element.mobileSize || !element.tabletSize) {
                initialized = false;
            }
            // Check children
            if (element.children?.length > 0) {
                element.children.forEach(child => {
                    if (!child.position?.mobile || !child.position?.tablet ||
                        !child.size || !child.mobileSize || !child.tabletSize) {
                        initialized = false;
                    }
                });
            }
            // Check if styles need syncing
            if (!element.responsiveStyles?.mobile || !element.responsiveStyles?.tablet) {
                needsSync = true;
            }
        });

        return { initialized, needsSync };
    };

    const { initialized, needsSync } = checkResponsiveStatus();

    const handleInitResponsive = () => {
        try {
            const initializedData = initializeResponsiveData(pageData);
            onUpdatePageData(initializedData);
            toast.success('✅ Đã khởi tạo responsive data cho tất cả elements!');
        } catch (error) {
            console.error('Error initializing responsive data:', error);
            toast.error('❌ Lỗi khi khởi tạo responsive data');
        }
    };

    const handleSyncResponsive = () => {
        try {
            const syncedData = syncAllElements(pageData, viewMode);
            onUpdatePageData(syncedData);
            toast.success('🔄 Đã sync responsive cho tất cả elements!');
        } catch (error) {
            console.error('Error syncing responsive data:', error);
            toast.error('❌ Lỗi khi sync responsive data');
        }
    };

    const viewModes = [
        { id: 'desktop', label: 'Desktop', icon: Monitor, width: 1200, color: '#3b82f6' },
        { id: 'tablet', label: 'Tablet', icon: Tablet, width: 768, color: '#8b5cf6' },
        { id: 'mobile', label: 'Mobile', icon: Smartphone, width: 375, color: '#10b981' }
    ];

    return (
        <ToolbarWrapper>
            {/* View Mode Selector */}
            <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                {viewModes.map(mode => {
                    const Icon = mode.icon;
                    const isActive = viewMode === mode.id;

                    return (
                        <ViewModeButton
                            key={mode.id}
                            isActive={isActive}
                            color={mode.color}
                            onClick={() => onViewModeChange(mode.id)}
                        >
                            <Icon size={16} />
                            <span className="label">{mode.label}</span>
                            <WidthBadge isActive={isActive} color={mode.color}>
                                {mode.width}px
                            </WidthBadge>
                        </ViewModeButton>
                    );
                })}
            </div>

            {/* Responsive Status & Actions */}
            <StatusWrapper>
                {!initialized ? (
                    <div
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <InitButton onClick={handleInitResponsive}>
                            <AlertCircle size={16} />
                            <span>Init Responsive</span>
                        </InitButton>
                        {showTooltip && (
                            <Tooltip>
                                Tạo responsive data cho tất cả elements
                            </Tooltip>
                        )}
                    </div>
                ) : needsSync ? (
                    <SyncButton onClick={handleSyncResponsive}>
                        <RefreshCw size={14} />
                        <span>Sync All</span>
                    </SyncButton>
                ) : (
                    <StatusBadge>
                        <Check size={14} />
                        <span>Responsive OK</span>
                    </StatusBadge>
                )}
            </StatusWrapper>

            {/* Current Info Badge */}
            <InfoBadge>
                <span>
                    <span style={{ opacity: 0.6 }}>Current:</span>
                    <span className="current-width">
                        {viewModes.find(m => m.id === viewMode)?.width}px
                    </span>
                </span>
            </InfoBadge>
        </ToolbarWrapper>
    );
};

export default ResponsiveToolbar;