import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';
import HeaderComponent from '../components/pages-content/HeaderComponent';
import ControlsComponent from '../components/pages-content/ControlsComponent';
import LandingList from '../components/pages-content/LandingList';
import CreatePagePopup from '../components/pages-content/CreatePagePopup';
import DogLoader from '../components/Loader';
import { toast } from 'react-toastify';
import '../styles/PageContent.css';

const PageContent = () => {
    const [userData, setUserData] = useState(null);
    const [userId, setUserId] = useState(null);
    const [landingPages, setLandingPages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Trạng thái');
    const [menuOpen, setMenuOpen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const navigate = useNavigate();

    const fetchLandingPages = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/pages');
            console.log('API /api/pages response:', response);
            if (Array.isArray(response.data)) {
                setLandingPages(response.data);
                const pagesWithoutScreenshot = response.data.filter((page) => !page.screenshot_url && page.file_path);
                if (pagesWithoutScreenshot.length > 0) {
                    console.log('Pages without screenshot:', pagesWithoutScreenshot.map((p) => p.id || p._id));
                    for (const page of pagesWithoutScreenshot) {
                        try {
                            const regenResponse = await api.get(`/api/pages/${page.id || page._id}/regenerate-screenshot`);
                            console.log(`Regenerate screenshot for page ${page._id}:`, regenResponse);
                        } catch (err) {
                            console.error(`Error regenerating screenshot for page ${page._id}:`, err);
                            toast.error(`Không thể tạo lại ảnh chụp màn hình cho trang ${page.name}`);
                        }
                    }
                    // Làm mới danh sách
                    const newResponse = await api.get('/api/pages');
                    setLandingPages(newResponse.data);
                }
            } else {
                console.error('Response data is not an array:', response.data);
                setLandingPages([]);
                toast.error('Dữ liệu landing page không hợp lệ');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Không thể tải danh sách landing page: ' + (err.response?.data?.error || err.message));
            setLandingPages([]);
            toast.error(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found in localStorage');
                setError('Vui lòng đăng nhập để tiếp tục');
                setLoading(false);
                navigate('/auth');
                return;
            }

            let decoded;
            try {
                decoded = jwtDecode(token);
                if (!decoded.userId) {
                    throw new Error('Invalid token: userId not found');
                }
            } catch (err) {
                console.error('Error decoding token:', err);
                setError('Phiên đăng nhập không hợp lệ');
                setLoading(false);
                navigate('/auth');
                return;
            }

            setUserId(decoded.userId);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            try {
                const res = await api.get('/api/user/info');
                setUserData(res.data);
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError('Không thể tải dữ liệu người dùng: ' + (err.response?.data?.error || err.message));
            }
        };
        initializeAuth();
    }, [navigate]);

    useEffect(() => {
        if (userId) {
            fetchLandingPages();
        }
    }, [userId, fetchLandingPages]);

    const filteredPages = landingPages.filter((page) => {
        const matchesSearch = page.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'Trạng thái' || page.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleCreatePage = () => {
        setIsPopupOpen(true);
    };

    const handleCreateSuccess = (page) => {
        console.log('Page created:', page);
        setLandingPages((prev) => [...prev, page]);
        navigate(`/pages/create?id=${page.id || page._id}`);
    };

    const handleEditPage = (page) => {
        navigate(`/pages/create?id=${page.id || page._id}`);
    };

    const handlePublishPage = async (pageId) => {
        try {
            setLoading(true);
            const response = await api.post(`/api/pages/${pageId}/publish`);
            console.log('Publish response:', response);
            if (response.data.success && response.data.page) {
                setLandingPages(landingPages.map((p) => (p.id === pageId ? response.data.page : p)));
                toast.success('Triển khai landing page thành công!');
                await fetchLandingPages();
            } else {
                toast.error('Triển khai landing page thất bại');
            }
        } catch (err) {
            console.error('Publish error:', err);
            toast.error('Lỗi khi triển khai landing page: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePage = async (pageId) => {
        if (!window.confirm('Bạn có chắc muốn xóa landing page này?')) return;
        try {
            setLoading(true);
            const response = await api.delete(`/api/pages/${pageId}`);
            if (response.data.success) {
                setLandingPages(landingPages.filter((p) => p.id !== pageId));
                toast.success('Xóa landing page thành công!');
            } else {
                toast.error('Xóa landing page thất bại');
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Lỗi khi xóa landing page: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handlePreviewPage = (pageId) => {
        navigate(`/pages/preview?id=${pageId}`);
    };

    const handleDeployPage = (pageId) => {
        navigate(`/pages/${pageId}/deploy`);
    };

    const formatDate = (date) => {
        if (!date) {
            console.warn('Date is null or undefined:', date);
            return 'Không có ngày';
        }
        try {
            let parsedDate;
            if (typeof date === 'string' && date.match(/^\d{2}:\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/)) {
                const [time, datePart] = date.split(' ');
                const [hours, minutes, seconds] = time.split(':').map(Number);
                const [day, month, year] = datePart.split('/').map(Number);
                parsedDate = new Date(year, month - 1, day, hours, minutes, seconds);
            } else {
                parsedDate = new Date(date);
            }
            if (isNaN(parsedDate.getTime())) {
                console.error('Invalid date:', date);
                return 'Ngày không hợp lệ';
            }
            return parsedDate.toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch (error) {
            console.error('Error formatting date:', error, { date });
            return 'Ngày không hợp lệ';
        }
    };

    if (loading) {
        return <DogLoader />;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="page-content">
            {/*<SidebarComponent />*/}
            <HeaderComponent onCreateClick={handleCreatePage} />
            <div className="main-content">
                <ControlsComponent
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                />
                <LandingList
                    landingPages={landingPages}
                    filteredPages={filteredPages}
                    menuOpen={menuOpen}
                    setMenuOpen={setMenuOpen}
                    handlePreviewPage={handlePreviewPage}
                    handleEditPage={handleEditPage}
                    handlePublishPage={handlePublishPage}
                    handleDeletePage={handleDeletePage}
                    handleDeployPage={handleDeployPage}
                    formatDate={formatDate}
                    onRefreshPages={fetchLandingPages}
                />
                <CreatePagePopup
                    isOpen={isPopupOpen}
                    onClose={() => setIsPopupOpen(false)}
                    onCreateSuccess={handleCreateSuccess}
                />
            </div>
        </div>
    );
};

export default PageContent;