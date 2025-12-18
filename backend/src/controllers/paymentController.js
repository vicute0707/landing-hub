const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const MarketplacePage = require('../models/MarketplacePage');
const Page = require('../models/Page');
const paymentService = require('../services/payment/paymentService');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order'); // Add this line

/**
 * Tạo transaction và payment URL
 */
// paymentController.js
exports.createTransaction = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { marketplace_page_id, payment_method } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.'
            });
        }

        const validMethods = ['MOMO', 'VNPAY', 'SANDBOX'];
        if (!validMethods.includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: 'Phương thức thanh toán không hợp lệ'
            });
        }

        const marketplacePage = await MarketplacePage.findById(marketplace_page_id)
            .populate('seller_id');

        if (!marketplacePage) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy landing page'
            });
        }

        if (!marketplacePage.seller_id?._id) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy thông tin người bán cho landing page này'
            });
        }

        if (marketplacePage.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                message: 'Landing page không khả dụng'
            });
        }

        if (payment_method !== 'SANDBOX' && marketplacePage.seller_id._id.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Bạn không thể mua landing page của chính mình'
            });
        }

        const amount = marketplacePage.price;
        const platform_fee = paymentService.calculatePlatformFee(amount);
        const seller_amount = paymentService.calculateSellerAmount(amount);

        const ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
        const user_agent = req.headers['user-agent'];

        // Chuẩn hóa orderInfo
        const orderInfo = `Thanh toan Landing Page - ${marketplace_page_id}`;
        const cleanOrderInfo = orderInfo
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\x00-\x7F]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const transaction = new Transaction({
            marketplace_page_id: marketplace_page_id,
            buyer_id: userId,
            seller_id: marketplacePage.seller_id._id,
            amount: amount,
            platform_fee: platform_fee,
            seller_amount: seller_amount,
            payment_method: payment_method,
            status: 'PENDING',
            ip_address: ip_address,
            user_agent: user_agent,
            metadata: {
                page_title: cleanOrderInfo,
                page_category: marketplacePage.category
            }
        });

        await transaction.save();

        const paymentResult = await paymentService.createPayment(
            transaction,
            payment_method,
            ip_address
        );

        if (!paymentResult.success) {
            await transaction.markAsFailed(paymentResult.error);
            return res.status(400).json({
                success: false,
                message: 'Không thể tạo thanh toán: ' + paymentResult.error
            });
        }

        res.json({
            success: true,
            message: 'Giao dịch đã được tạo',
            data: {
                transaction_id: transaction._id,
                payment_url: paymentResult.paymentUrl || paymentResult.payUrl,
                qr_code_url: paymentResult.qrCodeUrl,
                deep_link: paymentResult.deeplink,
                amount: amount,
                expires_at: transaction.expires_at
            }
        });
    } catch (error) {
        console.error('Create Transaction Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo giao dịch',
            error: error.message
        });
    }
};

exports.momoIPN = async (req, res) => {
    try {
        // Get data from body (POST) or query (GET)
        const ipnData = req.method === 'POST' ? req.body : req.query;

        console.log('✅ MOMO IPN Received (' + req.method + '):', JSON.stringify(ipnData));

        // ✅ CHECK: Empty data (health check từ MOMO)
        if (!ipnData || Object.keys(ipnData).length === 0) {
            console.log('⚠️ MOMO IPN: Empty data (health check), returning 200 OK');
            return res.status(200).json({ message: 'OK' });
        }

        // ✅ CHECK: Required fields
        if (!ipnData.orderId || !ipnData.signature) {
            console.error('❌ MOMO IPN: Missing required fields', {
                hasOrderId: !!ipnData.orderId,
                hasSignature: !!ipnData.signature
            });
            return res.status(200).json({ message: 'Missing fields' });
        }

        // Convert string numbers to integers if needed
        if (typeof ipnData.resultCode === 'string') {
            ipnData.resultCode = parseInt(ipnData.resultCode);
        }
        if (typeof ipnData.amount === 'string') {
            ipnData.amount = parseInt(ipnData.amount);
        }

        console.log('🔐 MOMO IPN: Verifying signature...');
        const verification = paymentService.verifyCallback('MOMO', ipnData);

        if (!verification.valid) {
            console.error('❌ MOMO IPN: Invalid signature', {
                orderId: ipnData.orderId,
                error: verification.error
            });
            return res.status(200).json({ message: 'Invalid signature' });
        }

        const { orderId, transId, resultCode } = verification.data;
        console.log('✅ MOMO IPN: Signature valid, orderId:', orderId);

        // Lấy transaction
        const transaction = await Transaction.findById(orderId);

        if (!transaction) {
            console.error('❌ MOMO IPN: Transaction not found', orderId);
            return res.status(200).json({ message: 'Transaction not found' });
        }

        // Check if already processed
        if (transaction.status === 'COMPLETED') {
            console.log('⚠️ MOMO IPN: Transaction already completed', orderId);
            return res.status(200).json({ message: 'Already processed' });
        }

        // Cập nhật transaction với gateway data
        transaction.payment_gateway_transaction_id = transId;
        transaction.payment_gateway_response = ipnData;

        if (resultCode === 0) {
            // Payment success
            console.log('✅ MOMO IPN: Payment success, processing...', orderId);
            await paymentService.processPaymentSuccess(orderId, ipnData);
            console.log('✅ MOMO IPN: Payment processed successfully!');
        } else {
            // Payment failed
            console.log('❌ MOMO IPN: Payment failed, resultCode:', resultCode);
            await transaction.markAsFailed(`MOMO Error: ${ipnData.message}`);
        }

        // Response to MOMO (return 204 for success)
        return res.status(200).send('OK');
    } catch (error) {
        console.error('💥 MOMO IPN Error:', error);
        res.status(200).json({ message: 'Error processed' });
    }
};

/**
 * Return callback từ MOMO (redirect user)
 */
exports.momoReturn = async (req, res) => {
    try {
        const { orderId, resultCode } = req.query;

        // Redirect to frontend với kết quả
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${frontendUrl}/payment/result?transaction_id=${orderId}&status=${resultCode === '0' ? 'success' : 'failed'}`;

        res.redirect(redirectUrl);
    } catch (error) {
        console.error('MOMO Return Error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/payment/result?status=error`);
    }
};

/**
 * IPN callback từ VNPay
 */
exports.vnpayIPN = async (req, res) => {
    try {
        const vnpParams = req.method === 'POST' ? req.body : req.query;
        console.log('VNPay IPN Received (' + req.method + '):', JSON.stringify(vnpParams, null, 2));

        if (!vnpParams.vnp_TxnRef || !vnpParams.vnp_SecureHash) {
            console.error('❌ VNPay IPN: Missing fields');
            return res.status(200).json({ RspCode: '01', Message: 'Missing fields' });
        }

        const verification = paymentService.verifyCallback('VNPAY', vnpParams);
        console.log('VNPay IPN Verification:', verification);

        if (!verification.valid) {
            console.error('❌ VNPay IPN: Invalid signature', verification.error);
            return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
        }

        const { orderId, transactionNo, responseCode } = verification.data;
        console.log('✅ VNPay IPN: Processing orderId:', orderId, 'responseCode:', responseCode);

        const transaction = await Transaction.findById(orderId);
        if (!transaction) {
            console.error('❌ VNPay IPN: Transaction not found', orderId);
            return res.status(200).json({ RspCode: '01', Message: 'Transaction not found' });
        }

        if (transaction.status === 'COMPLETED') {
            console.log('⚠️ VNPay IPN: Already completed', orderId);
            return res.status(200).json({ RspCode: '02', Message: 'Already processed' });
        }

        transaction.payment_gateway_transaction_id = transactionNo;
        transaction.payment_gateway_response = vnpParams;

        if (responseCode === '00') {
            await paymentService.processPaymentSuccess(orderId, vnpParams);
            console.log('✅ VNPay IPN: Payment success processed', orderId);
        } else {
            await transaction.markAsFailed(`VNPay Error: ${responseCode}`);
            console.log('❌ VNPay IPN: Payment failed', orderId);
        }

        return res.status(200).json({ RspCode: '00', Message: 'Success' });
    } catch (error) {
        console.error('💥 VNPay IPN Error:', error);
        return res.status(200).json({ RspCode: '99', Message: error.message });
    }
};

/**
 * Return callback từ VNPay
 */
exports.vnpayReturn = async (req, res) => {
    console.log('VNPay Callback Received:', req.query);
    try {
        const result = paymentService.verifyCallback('VNPAY', req.query);
        if (!result.valid) {
            console.error('❌ VNPay Callback Invalid:', result.error, { query: req.query });
            return res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=failed&transaction_id=${result.data?.orderId || 'undefined'}&error=${encodeURIComponent(result.error)}`);
        }
        if (result.success) {
            const processResult = await paymentService.processPaymentSuccess(result.data.orderId, result.data);
            if (processResult.success) {
                console.log('✅ VNPay Callback Success:', { transactionId: result.data.orderId });
                return res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=success&transaction_id=${result.data.orderId}`);
            }
            console.error('❌ VNPay Process Payment Failed:', processResult.error);
            return res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=failed&transaction_id=${result.data.orderId}&error=${encodeURIComponent(processResult.error)}`);
        }
        console.error('❌ VNPay Callback Not Successful:', result.data);
        return res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=failed&transaction_id=${result.data?.orderId || 'undefined'}&error=transaction_failed`);
    } catch (error) {
        console.error('❌ VNPay Callback Error:', error.message, { query: req.query });
        return res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=failed&transaction_id=undefined&error=${encodeURIComponent(error.message)}`);
    }
};

/**
 * Sandbox payment confirm (for testing)
 */
exports.sandboxConfirm = async (req, res) => {
    try {
        const { transaction_id, success = true } = req.body;

        const sandboxService = require('../services/payment/sandboxService');
        const result = await sandboxService.confirmPayment(transaction_id, success);

        if (result.success) {
            if (success) {
                await paymentService.processPaymentSuccess(transaction_id, result.data);
            } else {
                const transaction = await Transaction.findById(transaction_id);
                if (transaction) {
                    await transaction.markAsFailed('User cancelled payment');
                }
            }
        }

        res.json({
            success: true,
            message: 'Sandbox payment confirmed',
            data: result.data
        });
    } catch (error) {
        console.error('Sandbox Confirm Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lấy trạng thái transaction
 */
exports.getTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const transaction = await Transaction.findById(id)
            .populate('marketplace_page_id')
            .populate('buyer_id', 'name email')
            .populate('seller_id', 'name email')
            .populate('created_page_id');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giao dịch'
            });
        }

        // Chỉ buyer hoặc seller mới xem được
        if (
            transaction.buyer_id._id.toString() !== userId.toString() &&
            transaction.seller_id._id.toString() !== userId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem giao dịch này'
            });
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('Get Transaction Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy trạng thái giao dịch',
            error: error.message
        });
    }
};

/**
 * Lấy lịch sử mua hàng (buyer)
 */
exports.getPurchaseHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const transactions = await Transaction.findUserPurchases(userId);

        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('Get Purchase History Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử mua hàng',
            error: error.message
        });
    }
};

/**
 * Lấy lịch sử bán hàng (seller)
 */
exports.getSalesHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const transactions = await Transaction.findUserSales(userId);

        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('Get Sales History Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử bán hàng',
            error: error.message
        });
    }
};

/**
 * Request refund (buyer)
 */
exports.requestRefund = async (req, res) => {
    try {
        const userId = req.user.id;
        const { transaction_id, reason } = req.body;

        const transaction = await Transaction.findById(transaction_id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giao dịch'
            });
        }

        if (transaction.buyer_id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền yêu cầu hoàn tiền cho giao dịch này'
            });
        }

        await transaction.requestRefund(reason);

        res.json({
            success: true,
            message: 'Đã gửi yêu cầu hoàn tiền. Admin sẽ xem xét trong thời gian sớm nhất.',
            data: transaction
        });
    } catch (error) {
        console.error('Request Refund Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * ADMIN: Lấy tất cả transactions
 */
exports.getAllTransactionsAdmin = async (req, res) => {
    try {
        const { status, payment_method, start_date, end_date, page = 1, limit = 10 } = req.query;

        let query = {};

        if (status) {
            query.status = status.toUpperCase(); // force giống DB
        }

        if (payment_method) {
            query.payment_method = payment_method;
        }

        if (start_date || end_date) {
            query.created_at = {};
            if (start_date) {
                query.created_at.$gte = new Date(start_date);
            }
            if (end_date) {
                query.created_at.$lte = new Date(end_date);
            }
        }

        const skip = (page - 1) * limit;

        const transactions = await Transaction.find(query)
            .populate('buyer_id', 'name email')
            .populate('seller_id', 'name email')
            .populate('marketplace_page_id', 'title price')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get All Transactions Admin Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * ADMIN: Lấy thống kê thanh toán
 */
exports.getPaymentStatsAdmin = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let matchQuery = { status: 'COMPLETED', is_deleted: false };
        if (start_date || end_date) {
            matchQuery.created_at = {};
            if (start_date) matchQuery.created_at.$gte = new Date(start_date);
            if (end_date) matchQuery.created_at.$lte = new Date(end_date);
        }

        const [totalRevenue, totalPlatformFee, statusCounts] = await Promise.all([
            Transaction.aggregate([
                { $match: matchQuery },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Transaction.aggregate([
                { $match: matchQuery },
                { $group: { _id: null, total: { $sum: '$platform_fee' } } }
            ]),
            Transaction.aggregate([
                { $match: { is_deleted: false } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                totalRevenue: totalRevenue[0]?.total || 0,
                totalPlatformFee: totalPlatformFee[0]?.total || 0,
                statusCounts: statusCounts.reduce((acc, stat) => {
                    acc[stat._id] = { count: stat.count, totalAmount: stat.totalAmount };
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Get Payment Stats Admin Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
/**
 * ADMIN: Export transactions
 */
exports.exportTransactionsAdmin = async (req, res) => {
    try {
        const { status, payment_method, start_date, end_date } = req.query;

        let query = {};

        if (status) query.status = status;
        if (payment_method) query.payment_method = payment_method;
        if (start_date || end_date) {
            query.created_at = {};
            if (start_date) query.created_at.$gte = new Date(start_date);
            if (end_date) query.created_at.$lte = new Date(end_date);
        }

        const transactions = await Transaction.find(query)
            .populate('buyer_id', 'name email')
            .populate('seller_id', 'name email')
            .populate('marketplace_page_id', 'title price')
            .sort({ created_at: -1 });

        // Create CSV
        let csv = 'ID,Date,Buyer,Seller,Product,Amount,Fee,Status,Method\n';
        transactions.forEach(txn => {
            csv += `${txn._id},${txn.created_at},${txn.buyer_id?.email || 'N/A'},${txn.seller_id?.email || 'N/A'},${txn.marketplace_page_id?.title || 'N/A'},${txn.amount},${txn.platform_fee},${txn.status},${txn.payment_method}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export Transactions Admin Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * USER: Lấy transactions của user
 */
exports.getUserTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, payment_method, start_date, end_date, page = 1, limit = 10 } = req.query;

        let query = {
            $or: [
                { buyer_id: userId },
                { seller_id: userId }
            ]
        };

        if (status) query.status = status;
        if (payment_method) query.payment_method = payment_method;
        if (start_date || end_date) {
            query.created_at = {};
            if (start_date) query.created_at.$gte = new Date(start_date);
            if (end_date) query.created_at.$lte = new Date(end_date);
        }

        const skip = (page - 1) * limit;

        const transactions = await Transaction.find(query)
            .populate('buyer_id', 'name email')
            .populate('seller_id', 'name email')
            .populate('marketplace_page_id', 'title price')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get User Transactions Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.checkPurchase = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { marketplace_page_id } = req.params;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.'
            });
        }

        const transaction = await Transaction.findOne({
            buyer_id: userId,
            marketplace_page_id: marketplace_page_id,
            status: 'COMPLETED'
        });

        res.json({
            success: true,
            hasPurchased: !!transaction
        });
    } catch (error) {
        console.error('Check Purchase Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra trạng thái mua hàng',
            error: error.message
        });
    }
};
/**
 * USER: Lấy thống kê cá nhân
 */
exports.getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Buyer stats
        const buyerStats = await Transaction.aggregate([
            { $match: { buyer_id: userObjectId, status: 'COMPLETED', is_deleted: false } },
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$amount' },
                    purchaseCount: { $sum: 1 },
                    avgPurchase: { $avg: '$amount' }
                }
            }
        ]);

        // Seller stats
        const sellerStats = await Transaction.aggregate([
            { $match: { seller_id: userObjectId, status: 'COMPLETED', is_deleted: false } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    totalEarned: { $sum: '$seller_amount' },
                    salesCount: { $sum: 1 },
                    avgSale: { $avg: '$amount' }
                }
            }
        ]);

        // Pending payout
        const pendingPayout = await Transaction.aggregate([
            {
                $match: {
                    seller_id: userObjectId,
                    status: 'COMPLETED',
                    payout_status: { $ne: 'COMPLETED' },
                    is_deleted: false
                }
            },
            { $group: { _id: null, total: { $sum: '$seller_amount' } } }
        ]);

        // Completed payout
        const completedPayout = await Transaction.aggregate([
            {
                $match: {
                    seller_id: userObjectId,
                    status: 'COMPLETED',
                    payout_status: 'COMPLETED',
                    is_deleted: false
                }
            },
            { $group: { _id: null, total: { $sum: '$seller_amount' } } }
        ]);

        // Transaction status breakdown
        const transactionStatus = await Transaction.aggregate([
            {
                $match: {
                    $or: [{ buyer_id: userObjectId }, { seller_id: userObjectId }],
                    is_deleted: false
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

        // Order transactions
        let orderTransactions = [];
        try {
            orderTransactions = await Order.aggregate([
                {
                    $match: {
                        $or: [{ buyerId: userObjectId }, { sellerId: userObjectId }],
                        is_deleted: false
                    }
                },
                {
                    $lookup: {
                        from: 'transactions', // Verify collection name
                        localField: 'transactionId',
                        foreignField: '_id',
                        as: 'transaction'
                    }
                },
                { $unwind: { path: '$transaction', preserveNullAndEmptyArrays: true } },
                {
                    $match: {
                        $or: [
                            { 'transaction.is_deleted': false },
                            { transaction: null } // Handle orders without transactions
                        ]
                    }
                },
                {
                    $project: {
                        orderId: 1,
                        status: 1,
                        transactionStatus: '$transaction.status',
                        amount: '$transaction.amount',
                        payment_method: '$transaction.payment_method',
                        createdAt: '$transaction.created_at'
                    }
                },
                { $sort: { createdAt: -1 } }
            ]);
        } catch (err) {
            console.error('Order aggregation error:', err);
            orderTransactions = []; // Fallback to empty array
        }

        res.json({
            success: true,
            data: {
                buyerStats: {
                    totalSpent: buyerStats[0]?.totalSpent || 0,
                    purchaseCount: buyerStats[0]?.purchaseCount || 0,
                    avgPurchase: buyerStats[0]?.avgPurchase || 0
                },
                sellerStats: {
                    totalRevenue: sellerStats[0]?.totalRevenue || 0,
                    totalEarned: sellerStats[0]?.totalEarned || 0,
                    salesCount: sellerStats[0]?.salesCount || 0,
                    avgSale: sellerStats[0]?.avgSale || 0,
                    pendingPayout: pendingPayout[0]?.total || 0,
                    completedPayout: completedPayout[0]?.total || 0
                },
                transactionStatus: transactionStatus.reduce((acc, stat) => {
                    acc[stat._id] = { count: stat.count, totalAmount: stat.totalAmount };
                    return acc;
                }, {}),
                orderTransactions
            }
        });
    } catch (error) {
        console.error('Get User Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê cá nhân',
            error: error.message
        });
    }
};/**
 * USER: Export transactions của user
 */
exports.exportUserTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, payment_method, start_date, end_date } = req.query;

        let query = {
            $or: [
                { buyer_id: userId },
                { seller_id: userId }
            ]
        };

        if (status) query.status = status;
        if (payment_method) query.payment_method = payment_method;
        if (start_date || end_date) {
            query.created_at = {};
            if (start_date) query.created_at.$gte = new Date(start_date);
            if (end_date) query.created_at.$lte = new Date(end_date);
        }

        const transactions = await Transaction.find(query)
            .populate('buyer_id', 'name email')
            .populate('seller_id', 'name email')
            .populate('marketplace_page_id', 'title price')
            .sort({ created_at: -1 });

        // Create CSV
        let csv = 'ID,Date,Type,Product,Amount,Status,Method\n';
        transactions.forEach(txn => {
            const type = txn.buyer_id._id.toString() === userId.toString() ? 'Purchase' : 'Sale';
            csv += `${txn._id},${txn.created_at},${type},${txn.marketplace_page_id?.title || 'N/A'},${txn.amount},${txn.status},${txn.payment_method}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=my-transactions.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export User Transactions Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * ADMIN: Revenue by time period (day/week/month)
 */
exports.getRevenueByPeriod = async (req, res) => {
    try {
        const { period = 'day', days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        let groupFormat;
        switch (period) {
            case 'day':
                groupFormat = '%Y-%m-%d';
                break;
            case 'week':
                groupFormat = '%Y-W%U';
                break;
            case 'month':
                groupFormat = '%Y-%m';
                break;
            default:
                groupFormat = '%Y-%m-%d';
        }

        const revenueData = await Transaction.aggregate([
            {
                $match: {
                    status: 'COMPLETED',
                    is_deleted: false,
                    created_at: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: groupFormat, date: '$created_at' }
                    },
                    totalRevenue: { $sum: '$amount' },
                    platformFee: { $sum: '$platform_fee' },
                    sellerAmount: { $sum: '$seller_amount' },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Tạo dữ liệu cho biểu đồ
        const labels = revenueData.map(data => data._id);
        const platformFees = revenueData.map(data => data.platformFee);
        const totalRevenues = revenueData.map(data => data.totalRevenue);
        const transactionCounts = revenueData.map(data => data.transactionCount);

        res.json({
            success: true,
            data: {
                revenueData,
                chart: {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: 'Phí nền tảng',
                                data: platformFees,
                                borderColor: '#4CAF50',
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                fill: true
                            },
                            {
                                label: 'Tổng doanh thu',
                                data: totalRevenues,
                                borderColor: '#2196F3',
                                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                fill: true
                            },
                            {
                                label: 'Số giao dịch',
                                data: transactionCounts,
                                borderColor: '#FF9800',
                                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Số tiền (VND)' }
                            },
                            x: {
                                title: { display: true, text: period === 'day' ? 'Ngày' : period === 'week' ? 'Tuần' : 'Tháng' }
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Get Revenue By Period Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
/**
 * ADMIN: Top sellers
 */
exports.getTopSellers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const topSellers = await Transaction.aggregate([
            { $match: { status: 'COMPLETED' } },
            {
                $group: {
                    _id: '$seller_id',
                    totalRevenue: { $sum: '$amount' },
                    totalEarned: { $sum: '$seller_amount' },
                    transactionCount: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'seller'
                }
            },
            { $unwind: '$seller' },
            {
                $project: {
                    seller_id: '$_id',
                    seller_name: '$seller.name',
                    seller_email: '$seller.email',
                    totalRevenue: 1,
                    totalEarned: 1,
                    transactionCount: 1,
                    _id: 0
                }
            }
        ]);

        res.json({
            success: true,
            data: topSellers
        });
    } catch (error) {
        console.error('Get Top Sellers Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * ADMIN: Top buyers
 */
exports.getTopBuyers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const topBuyers = await Transaction.aggregate([
            { $match: { status: 'COMPLETED' } },
            {
                $group: {
                    _id: '$buyer_id',
                    totalSpent: { $sum: '$amount' },
                    purchaseCount: { $sum: 1 }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: parseInt(limit) },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'buyer'
                }
            },
            { $unwind: '$buyer' },
            {
                $project: {
                    buyer_id: '$_id',
                    buyer_name: '$buyer.name',
                    buyer_email: '$buyer.email',
                    totalSpent: 1,
                    purchaseCount: 1,
                    avgOrderValue: { $divide: ['$totalSpent', '$purchaseCount'] },
                    _id: 0
                }
            }
        ]);

        res.json({
            success: true,
            data: topBuyers
        });
    } catch (error) {
        console.error('Get Top Buyers Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * ADMIN: Payment method distribution
 */
exports.getPaymentMethodStats = async (req, res) => {
    try {
        const methodStats = await Transaction.aggregate([
            { $match: { status: 'COMPLETED' } },
            {
                $group: {
                    _id: '$payment_method',
                    totalRevenue: { $sum: '$amount' },
                    transactionCount: { $sum: 1 },
                    avgAmount: { $avg: '$amount' }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        // Calculate percentages
        const totalTransactions = methodStats.reduce((sum, stat) => sum + stat.transactionCount, 0);
        const totalRevenue = methodStats.reduce((sum, stat) => sum + stat.totalRevenue, 0);

        const enrichedStats = methodStats.map(stat => ({
            ...stat,
            transactionPercentage: totalTransactions > 0
                ? ((stat.transactionCount / totalTransactions) * 100).toFixed(2)
                : 0,
            revenuePercentage: totalRevenue > 0
                ? ((stat.totalRevenue / totalRevenue) * 100).toFixed(2)
                : 0
        }));

        res.json({
            success: true,
            data: {
                stats: enrichedStats,
                totals: {
                    totalTransactions,
                    totalRevenue
                }
            }
        });
    } catch (error) {
        console.error('Get Payment Method Stats Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * ADMIN: Performance metrics
 */
exports.getPerformanceMetrics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Success rate
        const [completed, failed, cancelled] = await Promise.all([
            Transaction.countDocuments({ status: 'COMPLETED', created_at: { $gte: startDate } }),
            Transaction.countDocuments({ status: 'FAILED', created_at: { $gte: startDate } }),
            Transaction.countDocuments({ status: 'CANCELLED', created_at: { $gte: startDate } })
        ]);

        const total = completed + failed + cancelled;
        const successRate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

        // Average transaction value
        const avgTransaction = await Transaction.aggregate([
            { $match: { status: 'COMPLETED', created_at: { $gte: startDate } } },
            { $group: { _id: null, avgAmount: { $avg: '$amount' } } }
        ]);

        // Average time to complete (PENDING to COMPLETED)
        const completionTimes = await Transaction.aggregate([
            {
                $match: {
                    status: 'COMPLETED',
                    created_at: { $gte: startDate },
                    paid_at: { $exists: true }
                }
            },
            {
                $project: {
                    timeToComplete: {
                        $subtract: ['$paid_at', '$created_at']
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgTimeMs: { $avg: '$timeToComplete' },
                    minTimeMs: { $min: '$timeToComplete' },
                    maxTimeMs: { $max: '$timeToComplete' }
                }
            }
        ]);

        // Refund rate
        const refunded = await Transaction.countDocuments({
            status: { $in: ['REFUNDED', 'REFUND_PENDING'] },
            created_at: { $gte: startDate }
        });
        const refundRate = completed > 0 ? ((refunded / completed) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            data: {
                transactionMetrics: {
                    total,
                    completed,
                    failed,
                    cancelled,
                    successRate: parseFloat(successRate)
                },
                revenueMetrics: {
                    avgTransactionValue: avgTransaction[0]?.avgAmount || 0
                },
                performanceMetrics: {
                    avgTimeToCompleteMs: completionTimes[0]?.avgTimeMs || 0,
                    avgTimeToCompleteMin: completionTimes[0]?.avgTimeMs
                        ? (completionTimes[0].avgTimeMs / 60000).toFixed(2)
                        : 0,
                    minTimeMs: completionTimes[0]?.minTimeMs || 0,
                    maxTimeMs: completionTimes[0]?.maxTimeMs || 0
                },
                refundMetrics: {
                    refundCount: refunded,
                    refundRate: parseFloat(refundRate)
                }
            }
        });
    } catch (error) {
        console.error('Get Performance Metrics Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.deliverOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
        }

        const transaction = await Transaction.findById(order.transactionId);
        if (!transaction || transaction.status !== 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Giao dịch chưa hoàn tất' });
        }

        const marketplacePage = await MarketplacePage.findById(order.marketplacePageId);
        if (!marketplacePage || (marketplacePage.seller_id.toString() !== userId && req.user.role !== 'admin')) {
            return res.status(403).json({ success: false, message: 'Không có quyền giao order' });
        }

        await order.deliverPage();
        console.log('Order delivered manually:', order.orderId);

        res.json({ success: true, message: 'Giao page thành công', data: order });
    } catch (error) {
        console.error('Deliver Order Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi giao page', error: error.message });
    }
};
/**
 * ADMIN: Lấy tất cả Order (Đơn hàng)
 */
exports.getAllOrdersAdmin = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        let query = {};
        if (status) {
            query.status = status;
        }

        // Tạm thời bỏ qua search phức tạp để tập trung vào order status
        // Nếu cần search phức tạp, cần dùng aggregation hoặc index

        const skip = (page - 1) * limit;

        const orders = await Order.find(query)
            .populate('buyerId', 'name email')
            .populate('sellerId', 'name email')
            .populate('marketplacePageId', 'title price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            data: orders,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get All Orders Admin Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đơn hàng', error: error.message });
    }
};

/**
 * ADMIN: Lấy tất cả yêu cầu hoàn tiền (Transaction status: REFUND_PENDING)
 */
exports.getRefundRequestsAdmin = async (req, res) => {
    try {
        // Chỉ lấy các giao dịch đang chờ hoàn tiền
        const refundRequests = await Transaction.find({ status: 'REFUND_PENDING' })
            .populate('buyer_id', 'name email')
            .populate('seller_id', 'name email')
            .populate('marketplace_page_id', 'title price')
            .sort({ created_at: -1 });

        // Lưu ý: Hàm này không có phân trang (pagination) để đơn giản hóa việc quản lý yêu cầu hoàn tiền

        res.json({
            success: true,
            data: refundRequests
        });
    } catch (error) {
        console.error('Get Refund Requests Admin Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách yêu cầu hoàn tiền', error: error.message });
    }
};
