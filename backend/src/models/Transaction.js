const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TransactionSchema = new mongoose.Schema({
    // DEPRECATED: is_deleted field is kept for backward compatibility but should NEVER be set to true
    // Transactions are permanent records and must not be deleted (hard or soft delete)
    is_deleted: { type: Boolean, default: false, index: true },
    _id: {
        type: String,
        default: uuidv4,
        match: [/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'Invalid UUID']
    },
    marketplace_page_id: {
        type: String,
        required: true,
        ref: 'MarketplacePage'
    },
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    platform_fee: {
        type: Number,
        default: 0,
        min: 0
    },
    seller_amount: {
        type: Number,
        required: true,
        min: 0
    },
    payment_method: {
        type: String,
        enum: ['MOMO', 'VNPAY', 'SANDBOX', 'COD', 'BANK_TRANSFER'],
        required: true
    },
    status: {
        type: String,
        enum: [
            'PENDING',
            'PROCESSING',
            'COMPLETED',
            'FAILED',
            'CANCELLED',
            'REFUNDED',
            'REFUND_PENDING'
        ],
        default: 'PENDING'
    },
    payout_status: {
        type: String,
        enum: [
            'PENDING',
            'PROCESSING',
            'COMPLETED',
            'FAILED'
        ],
        default: 'PENDING'
    },
    payout_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payout',
        default: null
    },
    payment_gateway_transaction_id: {
        type: String,
        trim: true,
        default: null
    },
    payment_gateway_response: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    payment_url: {
        type: String,
        trim: true,
        default: null
    },
    qr_code_url: {
        type: String,
        trim: true,
        default: null
    },
    deep_link: {
        type: String,
        trim: true,
        default: null
    },
    paid_at: {
        type: Date,
        default: null
    },
    refund: {
        reason: {
            type: String,
            trim: true,
            maxlength: 500
        },
        requested_at: {
            type: Date,
            default: null
        },
        processed_at: {
            type: Date,
            default: null
        },
        refund_transaction_id: {
            type: String,
            trim: true
        }
    },
    created_page_id: {
        type: String,
        ref: 'Page',
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ip_address: {
        type: String,
        trim: true,
        default: null
    },
    user_agent: {
        type: String,
        trim: true,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
    // IMPORTANT: Transactions are permanent records and should NEVER expire or be deleted
    // All transaction statuses (PENDING, COMPLETED, FAILED, REFUNDED, etc.) must be preserved
    // for legal compliance, accounting, and audit purposes
}, {
    collection: 'transactions',
    timestamps: false
});

// Indexes
TransactionSchema.index({ buyer_id: 1, status: 1 });
TransactionSchema.index({ seller_id: 1, status: 1 });
TransactionSchema.index({ marketplace_page_id: 1 });
TransactionSchema.index({ payment_gateway_transaction_id: 1 });
TransactionSchema.index({ status: 1, created_at: -1 });
TransactionSchema.index({ created_at: -1 });

// Pre-save middleware
TransactionSchema.pre('save', function(next) {
    this.updated_at = new Date();
    if (!this.seller_amount && this.amount) {
        this.seller_amount = this.amount - this.platform_fee;
    }
    next();
});

// Virtual fields
TransactionSchema.virtual('formatted_amount').get(function() {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(this.amount);
});

TransactionSchema.virtual('formatted_platform_fee').get(function() {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(this.platform_fee);
});

TransactionSchema.virtual('formatted_seller_amount').get(function() {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(this.seller_amount);
});



TransactionSchema.virtual('formatted_created_at').get(function() {
    return this.created_at ? this.created_at.toLocaleString('vi-VN') : null;
});

TransactionSchema.virtual('formatted_paid_at').get(function() {
    return this.paid_at ? this.paid_at.toLocaleString('vi-VN') : null;
});

TransactionSchema.methods.markAsPaid = async function(paymentGatewayData = {}) {
    try {
        console.log('✅ markAsPaid called for transaction:', this._id);

        // ✅ STEP 1: Save transaction first (CRITICAL - must not fail)
        this.status = 'COMPLETED'
        this.paid_at = new Date();
        this.payment_gateway_response = paymentGatewayData;
        await this.save();
        console.log('✅ Transaction saved as COMPLETED:', this._id);

        const Order = require('./Order');
        const MarketplacePage = require('./MarketplacePage');
        const { sendOrderConfirmation } = require('../services/email');

        // ✅ STEP 2: Create or find order (wrap in try-catch to prevent transaction rollback)
        let order = null;
        try {
            order = await Order.findOne({ transactionId: this._id });

            if (!order) {
                console.log('📦 No existing order found, creating new order...');
                const marketplacePage = await MarketplacePage.findById(this.marketplace_page_id);

                if (!marketplacePage) {
                    console.error('❌ MarketplacePage not found for ID:', this.marketplace_page_id);
                    return this; // Return transaction, don't fail
                }

                order = new Order({
                    orderId: require('uuid').v4(),
                    transactionId: this._id,
                    buyerId: this.buyer_id,
                    sellerId: this.seller_id,
                    marketplacePageId: this.marketplace_page_id,
                    price: this.amount,
                    payment_method: this.payment_method, // ✅ FIX: Add payment_method
                    status: 'pending',
                    is_deleted: false // ✅ ENSURE: Explicitly set is_deleted to false
                });

                await order.save();
                console.log('✅ New order created and saved:', order.orderId);
            } else {
                console.log('📦 Found existing order:', order.orderId);
            }
        } catch (orderError) {
            console.error('❌ Error creating/finding order (transaction still saved):', orderError);
            // Transaction is still saved, continue without order
            return this;
        }

        // ✅ STEP 3: Deliver page (wrap in try-catch to prevent transaction rollback)
        if (order && order.status === 'pending') {
            try {
                await order.deliverPage();
                console.log('✅ Order delivered:', order.orderId);

                // Send real-time notifications via WebSocket (serverless)
                if (global._websocket) {
                    try {
                        await global._websocket.notifyOrderDelivered(order.buyerId.toString(), {
                            orderId: order.orderId,
                            marketplacePageId: order.marketplacePageId,
                            createdPageId: order.createdPageId
                        });

                        await global._websocket.notifyNewSale(order.sellerId.toString(), {
                            orderId: order.orderId,
                            marketplacePageId: order.marketplacePageId,
                            amount: this.amount
                        });

                        await global._websocket.notifyUserDashboard(order.buyerId.toString(), {
                            type: 'order_delivered',
                            orderId: order.orderId
                        });

                        await global._websocket.notifyUserDashboard(order.sellerId.toString(), {
                            type: 'new_sale',
                            orderId: order.orderId,
                            amount: this.amount
                        });

                        await global._websocket.notifyAdminDashboard({
                            type: 'new_order',
                            orderId: order.orderId
                        });
                        console.log('✅ WebSocket notifications sent');
                    } catch (wsError) {
                        console.error('❌ WebSocket notification error (non-critical):', wsError);
                    }
                }
            } catch (deliverError) {
                console.error('❌ Error delivering page (transaction still saved):', deliverError);
                // Transaction is still saved, order creation succeeded but delivery failed
            }
        } else if (order) {
            console.log('📦 Order already processed:', order.status);
        }

        // ✅ STEP 4: Send email (non-critical, wrapped in try-catch)
        if (order) {
            try {
                await sendOrderConfirmation(order);
                console.log('✅ Order confirmation email sent');
            } catch (emailError) {
                console.error('❌ Failed to send order confirmation (non-critical):', emailError);
            }
        }

        // ✅ STEP 5: Increment sold count (non-critical, wrapped in try-catch)
        try {
            await MarketplacePage.findByIdAndUpdate(this.marketplace_page_id, { $inc: { sold_count: 1 } });
            console.log('✅ Incremented sold_count for MarketplacePage:', this.marketplace_page_id);
        } catch (soldCountError) {
            console.error('❌ Failed to increment sold_count (non-critical):', soldCountError);
        }

        return this;
    } catch (error) {
        console.error('❌ CRITICAL Error in markAsPaid:', error);
        throw error;
    }
};

TransactionSchema.methods.markAsFailed = async function(reason) {
    this.status = 'FAILED';
    this.metadata.failure_reason = reason;
    return this.save();
};

TransactionSchema.methods.cancel = async function(reason) {
    if (this.status === 'COMPLETED') {
        throw new Error('Cannot cancel completed transaction');
    }
    this.status = 'CANCELLED';
    this.metadata.cancellation_reason = reason;
    return this.save();
};

TransactionSchema.methods.requestRefund = async function(reason) {
    if (this.status !== 'COMPLETED') {
        throw new Error('Can only refund completed transactions');
    }
    this.status = 'REFUND_PENDING';
    this.refund = {
        reason: reason,
        requested_at: new Date()
    };
    await this.save();

    // 🔔 Send email notification to admin
    try {
        const { sendRefundRequestNotification } = require('../services/email');
        await sendRefundRequestNotification(this);
    } catch (emailError) {
        console.error('Failed to send refund request email:', emailError.message);
        // Don't block the refund request if email fails
    }

    // 🔔 Create in-app notification for admin
    try {
        const Notification = require('./Notification');
        const User = require('./User');

        // Find admin users
        const admins = await User.find({ role: 'admin' });

        // Create notification for each admin
        for (const admin of admins) {
            await Notification.create({
                recipientId: admin._id,
                type: 'refund_requested',
                title: 'Yêu cầu hoàn tiền mới',
                message: `Có yêu cầu hoàn tiền cho giao dịch ${this._id}. Số tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(this.amount)}`,
                metadata: {
                    transactionId: this._id,
                    buyerId: this.buyer_id,
                    reason: reason
                }
            });
        }
    } catch (notifError) {
        console.error('Failed to create refund notification:', notifError.message);
    }

    return this;
};

TransactionSchema.methods.processRefund = async function(refundTransactionId) {
    if (this.status !== 'REFUND_PENDING') {
        throw new Error('Transaction is not in refund pending status');
    }
    this.status = 'REFUNDED';
    this.refund.processed_at = new Date();
    this.refund.refund_transaction_id = refundTransactionId;
    return this.save();
};

TransactionSchema.methods.setCreatedPage = async function(pageId) {
    this.created_page_id = pageId;
    return this.save();
};

// Static methods
// Note: All PENDING transactions are kept permanently for audit trail
// Admin should manually review and handle old pending transactions
TransactionSchema.statics.findPendingTransactions = function() {
    return this.find({
        status: 'PENDING'
    }).sort({ created_at: -1 });
};

TransactionSchema.statics.findCompletedTransactions = function(options = {}) {
    const query = { status: 'COMPLETED' };

    if (options.buyer_id) {
        query.buyer_id = options.buyer_id;
    }

    if (options.seller_id) {
        query.seller_id = options.seller_id;
    }

    if (options.start_date) {
        query.created_at = { ...query.created_at, $gte: new Date(options.start_date) };
    }

    if (options.end_date) {
        query.created_at = { ...query.created_at, $lte: new Date(options.end_date) };
    }

    return this.find(query)
        .populate('buyer_id', 'name email')
        .populate('seller_id', 'name email')
        .populate('marketplace_page_id')
        .sort({ created_at: -1 });
};

TransactionSchema.statics.findUserPurchases = function(userId) {
    return this.find({
        buyer_id: userId,
        status: 'COMPLETED'
    })
        .populate('marketplace_page_id')
        .populate('seller_id', 'name email')
        .sort({ created_at: -1 });
};

TransactionSchema.statics.findUserSales = function(userId) {
    return this.find({
        seller_id: userId,
        status: 'COMPLETED'
    })
        .populate('marketplace_page_id')
        .populate('buyer_id', 'name email')
        .sort({ created_at: -1 });
};

TransactionSchema.statics.calculateRevenue = async function(options = {}) {
    const mongoose = require('mongoose');
    const match = { status: 'COMPLETED' };

    if (options.seller_id) {
        match.seller_id = typeof options.seller_id === 'string'
            ? new mongoose.Types.ObjectId(options.seller_id)
            : options.seller_id;
    }

    if (options.start_date) {
        match.created_at = { ...match.created_at, $gte: new Date(options.start_date) };
    }

    if (options.end_date) {
        match.created_at = { ...match.created_at, $lte: new Date(options.end_date) };
    }

    const result = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                total_revenue: { $sum: '$amount' },
                total_platform_fee: { $sum: '$platform_fee' },
                total_seller_amount: { $sum: '$seller_amount' },
                transaction_count: { $sum: 1 }
            }
        }
    ]);

    return result.length > 0 ? result[0] : {
        total_revenue: 0,
        total_platform_fee: 0,
        total_seller_amount: 0,
        transaction_count: 0
    };
};

TransactionSchema.statics.findRefundRequests = function () {
    return this.find({ status: 'REFUND_PENDING' })
        .populate('buyer_id', 'name email')
        .populate('seller_id', 'name email')
        .populate('marketplace_page_id', 'title')
        .sort({ 'refund.requested_at': 1 });
};

TransactionSchema.methods.autoRefund = async function(reason = 'User request') {
    if (!['COMPLETED', 'REFUND_PENDING'].includes(this.status))
        throw new Error('Only completed or pending-refund transactions can be refunded');

    const daysSincePaid = (Date.now() - this.paid_at) / (1000 * 3600 * 24);
    const canAuto = daysSincePaid < 7 && this.payout_status !== 'COMPLETED';

    if (canAuto) {
        // Auto refund - hoàn tiền tự động
        this.status = 'REFUNDED';
        this.refund = {
            reason,
            requested_at: new Date(),
            processed_at: new Date(),
            refund_transaction_id: `AUTO_${this._id}`
        };
        await this.save();

        // Trừ doanh thu marketplacePage
        const MarketplacePage = require('./MarketplacePage');
        await MarketplacePage.findByIdAndUpdate(this.marketplace_page_id, {
            $inc: { sold_count: -1 }
        }).catch(err => {
            console.error('Failed to decrement sold_count:', err.message);
        });

        // Gửi email thông báo hoàn tiền thành công
        try {
            const { sendRefundCompleted } = require('../services/email');
            const Order = require('./Order');
            const order = await Order.findOne({ transactionId: this._id });
            if (order) {
                order.status = 'refunded';
                await order.save();
                await sendRefundCompleted(order);
            }
        } catch (emailError) {
            console.error('Failed to send refund completion email:', emailError.message);
        }

        console.log(`✅ Auto refund completed for transaction ${this._id}`);
        return { success: true, auto: true, message: 'Hoàn tiền tự động thành công' };
    } else {
        // Chuyển admin duyệt
        console.log(`⏳ Manual refund required for transaction ${this._id} (${daysSincePaid.toFixed(1)} days old)`);
        await this.requestRefund(reason);
        return { success: true, auto: false, message: 'Yêu cầu hoàn tiền đã được gửi đến admin để xử lý' };
    }
};


module.exports = mongoose.model('Transaction', TransactionSchema);