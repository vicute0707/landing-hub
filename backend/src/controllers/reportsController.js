const Transaction = require('../models/Transaction');
const Page = require('../models/Page');
const MarketplacePage = require('../models/MarketplacePage');
const FormSubmission = require('../models/FormSubmission');
const mongoose = require('mongoose');

/**
 * ========== BÁO CÁO TÀI CHÍNH CHO USER ==========
 * Tổng quan thu chi, doanh số, số dư
 */
const getUserFinancialReport = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;
        const { startDate, endDate, period = 'all' } = req.query;

        // Xác định khoảng thời gian
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                created_at: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        } else if (period !== 'all') {
            const now = new Date();
            const periods = {
                'today': new Date(now.setHours(0, 0, 0, 0)),
                'week': new Date(now.setDate(now.getDate() - 7)),
                'month': new Date(now.setMonth(now.getMonth() - 1)),
                'quarter': new Date(now.setMonth(now.getMonth() - 3)),
                'year': new Date(now.setFullYear(now.getFullYear() - 1))
            };
            if (periods[period]) {
                dateFilter.created_at = { $gte: periods[period] };
            }
        }

        // ========== 1. TỔNG QUAN TÀI CHÍNH ==========
        const [purchaseStats, salesStats] = await Promise.all([
            // Thống kê mua
            Transaction.aggregate([
                {
                    $match: {
                        buyer_id: userId,
                        status: 'COMPLETED',
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSpent: { $sum: '$amount' },
                        platformFees: { $sum: '$platform_fee' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    }
                }
            ]),

            // Thống kê bán
            Transaction.aggregate([
                {
                    $match: {
                        seller_id: userId,
                        status: 'COMPLETED',
                        ...dateFilter
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$amount' },
                        totalEarned: { $sum: '$seller_amount' },
                        platformFees: { $sum: '$platform_fee' },
                        count: { $sum: 1 },
                        avgAmount: { $avg: '$amount' }
                    }
                }
            ])
        ]);

        const purchases = purchaseStats[0] || {
            totalSpent: 0,
            platformFees: 0,
            count: 0,
            avgAmount: 0
        };

        const sales = salesStats[0] || {
            totalRevenue: 0,
            totalEarned: 0,
            platformFees: 0,
            count: 0,
            avgAmount: 0
        };

        // ========== 2. THỐNG KÊ THEO THỜI GIAN ==========
        const monthlySales = await Transaction.aggregate([
            {
                $match: {
                    seller_id: userId,
                    status: 'COMPLETED',
                    created_at: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$created_at' },
                        month: { $month: '$created_at' }
                    },
                    revenue: { $sum: '$amount' },
                    earned: { $sum: '$seller_amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // ========== 3. TOP PAGES BÁN CHẠY ==========
        const topSellingPages = await Transaction.aggregate([
            {
                $match: {
                    seller_id: userId,
                    status: 'COMPLETED'
                }
            },
            {
                $group: {
                    _id: '$page_id',
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' },
                    totalEarned: { $sum: '$seller_amount' }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'marketplacepages',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'pageInfo'
                }
            },
            { $unwind: { path: '$pageInfo', preserveNullAndEmptyArrays: true } }
        ]);

        // ========== 4. TRẠNG THÁI GIAO DỊCH ==========
        const transactionStatus = await Transaction.aggregate([
            {
                $match: {
                    $or: [
                        { buyer_id: userId },
                        { seller_id: userId }
                    ]
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        // ========== 5. SỐ DƯ & PENDING PAYOUTS ==========
        const balance = sales.totalEarned - purchases.totalSpent;
        const pendingPayouts = await Transaction.aggregate([
            {
                $match: {
                    seller_id: userId,
                    status: 'COMPLETED',
                    payout_status: { $ne: 'PAID' }
                }
            },
            {
                $group: {
                    _id: null,
                    pendingAmount: { $sum: '$seller_amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const formatVND = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        };

        res.json({
            success: true,
            data: {
                // Tổng quan
                summary: {
                    purchases: {
                        count: purchases.count,
                        totalSpent: formatVND(purchases.totalSpent),
                        totalSpentRaw: purchases.totalSpent,
                        avgPerPurchase: formatVND(purchases.avgAmount),
                        platformFees: formatVND(purchases.platformFees)
                    },
                    sales: {
                        count: sales.count,
                        totalRevenue: formatVND(sales.totalRevenue),
                        totalRevenueRaw: sales.totalRevenue,
                        totalEarned: formatVND(sales.totalEarned),
                        totalEarnedRaw: sales.totalEarned,
                        avgPerSale: formatVND(sales.avgAmount),
                        platformFees: formatVND(sales.platformFees),
                        feePercentage: sales.totalRevenue > 0 ? ((sales.platformFees / sales.totalRevenue) * 100).toFixed(1) + '%' : '0%'
                    },
                    balance: {
                        amount: formatVND(balance),
                        amountRaw: balance,
                        status: balance >= 0 ? 'positive' : 'negative'
                    },
                    pendingPayouts: {
                        count: pendingPayouts[0]?.count || 0,
                        amount: formatVND(pendingPayouts[0]?.pendingAmount || 0),
                        amountRaw: pendingPayouts[0]?.pendingAmount || 0
                    }
                },

                // Biểu đồ theo tháng
                monthlyData: monthlySales.map(item => ({
                    month: `${item._id.month}/${item._id.year}`,
                    revenue: item.revenue,
                    earned: item.earned,
                    count: item.count,
                    revenueFormatted: formatVND(item.revenue),
                    earnedFormatted: formatVND(item.earned)
                })),

                // Top pages
                topPages: topSellingPages.map(item => ({
                    pageId: item._id,
                    pageName: item.pageInfo?.name || 'Đã xóa',
                    pagePrice: formatVND(item.pageInfo?.price || 0),
                    totalSales: item.totalSales,
                    totalRevenue: formatVND(item.totalRevenue),
                    totalEarned: formatVND(item.totalEarned),
                    totalRevenueRaw: item.totalRevenue,
                    totalEarnedRaw: item.totalEarned
                })),

                // Trạng thái giao dịch
                transactionStatus: transactionStatus.map(item => ({
                    status: item._id,
                    count: item.count,
                    totalAmount: formatVND(item.totalAmount),
                    totalAmountRaw: item.totalAmount
                })),

                // Metadata
                period: period,
                dateRange: startDate && endDate ? { startDate, endDate } : null,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ [REPORTS] User Financial Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo báo cáo tài chính',
            error: error.message
        });
    }
};

/**
 * ========== BÁO CÁO ADMIN - TỔNG QUAN HỆ THỐNG ==========
 * Báo cáo kinh tế chuẩn Việt Nam: doanh thu, phí, top người dùng (có tên), lead, marketplace.
 */
const getAdminSystemReport = async (req, res) => {
    try {
        // Định nghĩa formatVND trước để tránh lỗi initialization
        const formatVND = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount || 0);
        };

        const { startDate, endDate } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                created_at: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        // ========== 1. THỐNG KÊ GIAO DỊCH ==========
        const transactionStats = await Transaction.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    platformFees: { $sum: '$platform_fee' }
                }
            }
        ]);

        // ========== 2. THỐNG KÊ MARKETPLACE ==========
        const marketplaceStats = await MarketplacePage.aggregate([
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    byStatus: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    priceRange: [
                        {
                            $group: {
                                _id: null,
                                avgPrice: { $avg: '$price' },
                                minPrice: { $min: '$price' },
                                maxPrice: { $max: '$price' }
                            }
                        }
                    ]
                }
            }
        ]);

        // ========== 3. TOP SELLERS ==========
        const topSellersRaw = await Transaction.aggregate([
            { $match: { status: 'COMPLETED' } },
            {
                $group: {
                    _id: '$seller_id',
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' },
                    totalEarned: { $sum: '$seller_amount' },
                    platformFees: { $sum: '$platform_fee' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 20 }
        ]);

        const topSellers = await Promise.all(
            topSellersRaw.map(async (item, index) => {
                const user = await mongoose.model('User').findById(item._id).select('name email avatar').lean();
                return {
                    rank: index + 1,
                    sellerId: item._id,
                    sellerName: user?.name || user?.email || `ID: ${item._id}`,
                    sellerEmail: user?.email || null,
                    sellerAvatar: user?.avatar || null,
                    totalSales: item.totalSales,
                    totalRevenue: formatVND(item.totalRevenue),
                    totalRevenueRaw: item.totalRevenue,
                    totalEarned: formatVND(item.totalEarned),
                    totalEarnedRaw: item.totalEarned,
                    platformFees: formatVND(item.platformFees),
                    feePercentage: item.totalRevenue > 0 ? ((item.platformFees / item.totalRevenue) * 100).toFixed(2) + '%' : '0%'
                };
            })
        );

        // ========== 4. TOP BUYERS ==========
        const topBuyersRaw = await Transaction.aggregate([
            { $match: { status: 'COMPLETED' } },
            {
                $group: {
                    _id: '$buyer_id',
                    totalPurchases: { $sum: 1 },
                    totalSpent: { $sum: '$amount' }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 20 }
        ]);

        const topBuyers = await Promise.all(
            topBuyersRaw.map(async (item, index) => {
                const user = await mongoose.model('User').findById(item._id).select('name email avatar').lean();
                return {
                    rank: index + 1,
                    buyerId: item._id,
                    buyerName: user?.name || user?.email || `ID: ${item._id}`,
                    buyerEmail: user?.email || null,
                    buyerAvatar: user?.avatar || null,
                    totalPurchases: item.totalPurchases,
                    totalSpent: formatVND(item.totalSpent),
                    totalSpentRaw: item.totalSpent
                };
            })
        );

        // ========== 5. DOANH THU THEO NGÀY (30 ngày gần nhất) ==========
        const dailyRevenue = await Transaction.aggregate([
            {
                $match: {
                    status: 'COMPLETED',
                    created_at: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$created_at' },
                        month: { $month: '$created_at' },
                        day: { $dayOfMonth: '$created_at' }
                    },
                    revenue: { $sum: '$amount' },
                    platformFees: { $sum: '$platform_fee' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        // ========== 6. THỐNG KÊ THEO PAYMENT METHOD ==========
        const paymentMethodStats = await Transaction.aggregate([
            { $match: { status: 'COMPLETED' } },
            {
                $group: {
                    _id: '$payment_method',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        // ========== 7. THỐNG KÊ LEADS (Form Submissions) ==========
        const leadsStats = await FormSubmission.aggregate([
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    today: [
                        {
                            $match: {
                                created_at: {
                                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    thisWeek: [
                        {
                            $match: {
                                created_at: {
                                    $gte: new Date(new Date().setDate(new Date().getDate() - 7))
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    thisMonth: [
                        {
                            $match: {
                                created_at: {
                                    $gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    byPage: [
                        {
                            $group: {
                                _id: '$page_id',
                                count: { $sum: 1 },
                                latestSubmission: { $max: '$created_at' }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ]
                }
            }
        ]);

        // Tính tổng platform fees và doanh thu
        const totalPlatformFees = transactionStats.reduce((sum, item) => sum + (item.platformFees || 0), 0);
        const totalRevenue = transactionStats.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

        res.json({
            success: true,
            data: {
                // Tổng quan (chuẩn kinh tế Việt Nam: doanh thu ròng, phí %)
                overview: {
                    totalRevenue: formatVND(totalRevenue),
                    totalRevenueRaw: totalRevenue,
                    platformFees: formatVND(totalPlatformFees),
                    platformFeesRaw: totalPlatformFees,
                    feePercentage: totalRevenue > 0 ? ((totalPlatformFees / totalRevenue) * 100).toFixed(2) + '%' : '0%'
                },

                // Giao dịch theo status
                transactions: {
                    byStatus: transactionStats.map(item => ({
                        status: item._id,
                        count: item.count,
                        totalAmount: formatVND(item.totalAmount),
                        totalAmountRaw: item.totalAmount,
                        platformFees: formatVND(item.platformFees),
                        platformFeesRaw: item.platformFees
                    })),
                    byPaymentMethod: paymentMethodStats.map(item => ({
                        method: item._id,
                        count: item.count,
                        totalAmount: formatVND(item.totalAmount),
                        totalAmountRaw: item.totalAmount
                    }))
                },

                // Marketplace
                marketplace: {
                    totalPages: marketplaceStats[0].total[0]?.count || 0,
                    byStatus: marketplaceStats[0].byStatus,
                    priceStats: {
                        avg: formatVND(marketplaceStats[0].priceRange[0]?.avgPrice || 0),
                        min: formatVND(marketplaceStats[0].priceRange[0]?.minPrice || 0),
                        max: formatVND(marketplaceStats[0].priceRange[0]?.maxPrice || 0)
                    }
                },

                // Top performers (có tên người dùng)
                topSellers,
                topBuyers,

                // Biểu đồ theo ngày (định dạng ngày Việt Nam)
                dailyRevenue: dailyRevenue.map(item => ({
                    date: `${item._id.day.toString().padStart(2, '0')}/${item._id.month.toString().padStart(2, '0')}/${item._id.year}`,
                    revenue: formatVND(item.revenue),
                    revenueRaw: item.revenue,
                    platformFees: formatVND(item.platformFees),
                    platformFeesRaw: item.platformFees,
                    count: item.count
                })),

                // Leads Statistics
                leads: {
                    total: leadsStats[0].total[0]?.count || 0,
                    today: leadsStats[0].today[0]?.count || 0,
                    thisWeek: leadsStats[0].thisWeek[0]?.count || 0,
                    thisMonth: leadsStats[0].thisMonth[0]?.count || 0,
                    topPages: leadsStats[0].byPage.map((item, index) => ({
                        rank: index + 1,
                        pageId: item._id,
                        leadsCount: item.count,
                        latestSubmission: item.latestSubmission ? new Date(item.latestSubmission).toLocaleString('vi-VN') : 'Chưa có'
                    }))
                },

                // Metadata
                dateRange: startDate && endDate ? { startDate, endDate } : null,
                generatedAt: new Date().toLocaleString('vi-VN')
            }
        });

    } catch (error) {
        console.error('❌ [REPORTS] Admin System Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo báo cáo hệ thống',
            error: error.message
        });
    }
};

/**
 * ========== BÁO CÁO PAGE PERFORMANCE ==========
 * Phân tích hiệu suất của các pages
 */
const getPagePerformanceReport = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;

        // Lấy tất cả pages của user
        const pages = await Page.find({ user_id: userId })
            .select('name status views revenue created_at updated_at')
            .lean();

        // Lấy marketplace pages của user
        const marketplacePages = await MarketplacePage.find({ seller_id: userId })
            .select('name price status views downloads created_at')
            .lean();

        // Thống kê sales cho từng marketplace page
        const salesByPage = await Transaction.aggregate([
            {
                $match: {
                    seller_id: userId,
                    status: 'COMPLETED'
                }
            },
            {
                $group: {
                    _id: '$page_id',
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: '$amount' },
                    totalEarned: { $sum: '$seller_amount' },
                    lastSale: { $max: '$created_at' }
                }
            }
        ]);

        const salesMap = {};
        salesByPage.forEach(item => {
            salesMap[item._id.toString()] = item;
        });

        const formatVND = (amount) => {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(amount);
        };

        const enrichedMarketplacePages = marketplacePages.map(page => {
            const sales = salesMap[page._id.toString()] || {
                totalSales: 0,
                totalRevenue: 0,
                totalEarned: 0,
                lastSale: null
            };

            return {
                pageId: page._id,
                pageName: page.name,
                price: formatVND(page.price),
                priceRaw: page.price,
                status: page.status,
                views: page.views || 0,
                downloads: page.downloads || 0,
                totalSales: sales.totalSales,
                totalRevenue: formatVND(sales.totalRevenue),
                totalRevenueRaw: sales.totalRevenue,
                totalEarned: formatVND(sales.totalEarned),
                totalEarnedRaw: sales.totalEarned,
                conversionRate: page.views > 0 ? ((sales.totalSales / page.views) * 100).toFixed(2) + '%' : '0%',
                lastSale: sales.lastSale ? new Date(sales.lastSale).toLocaleString('vi-VN') : 'Chưa có',
                createdAt: new Date(page.created_at).toLocaleString('vi-VN')
            };
        });

        res.json({
            success: true,
            data: {
                totalPages: pages.length,
                totalMarketplacePages: marketplacePages.length,
                pages: pages.map(page => ({
                    pageId: page._id,
                    pageName: page.name,
                    status: page.status,
                    views: page.views || 0,
                    revenue: formatVND(page.revenue || 0),
                    revenueRaw: page.revenue || 0,
                    createdAt: new Date(page.created_at).toLocaleString('vi-VN'),
                    updatedAt: new Date(page.updated_at).toLocaleString('vi-VN')
                })),
                marketplacePages: enrichedMarketplacePages,
                generatedAt: new Date().toLocaleString('vi-VN')
            }
        });

    } catch (error) {
        console.error('❌ [REPORTS] Page Performance Report Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo báo cáo hiệu suất pages',
            error: error.message
        });
    }
};

module.exports = {
    getUserFinancialReport,
    getAdminSystemReport,
    getPagePerformanceReport
};