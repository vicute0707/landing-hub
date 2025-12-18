const crypto = require('crypto');
const axios = require('axios');

class MomoService {
    constructor() {
        this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
        this.accessKey = process.env.MOMO_ACCESS_KEY || '';
        this.secretKey = process.env.MOMO_SECRET_KEY || '';
        this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
        this.redirectUrl = process.env.MOMO_REDIRECT_URL || 'https://landinghub.shop/payment/momo/callback';
        this.ipnUrl = process.env.MOMO_IPN_URL || 'https://api.landinghub.shop/api/payment/momo/ipn';
        this.requestType = 'captureWallet';
    }

    /**
     * Tạo chữ ký HMAC SHA256
     */
    createSignature(rawSignature) {
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(rawSignature)
            .digest('hex');
    }

    /**
     * Tạo payment request
     */
    async createPayment({
                            orderId,
                            amount,
                            orderInfo,
                            extraData = '',
                            autoCapture = true,
                            lang = 'vi'
                        }) {
        try {
            // Kiểm tra credentials
            if (!this.accessKey || !this.secretKey || this.accessKey === '' || this.secretKey === '') {
                console.warn('⚠️ MOMO credentials not configured. Please set MOMO_ACCESS_KEY and MOMO_SECRET_KEY in .env');
                return {
                    success: false,
                    error: 'MOMO chưa được cấu hình. Vui lòng liên hệ admin để thiết lập.'
                };
            }

            const requestId = orderId;

            // Raw signature
            const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=${this.requestType}`;

            const signature = this.createSignature(rawSignature);

            const requestBody = {
                partnerCode: this.partnerCode,
                partnerName: 'Landing Hub',
                storeId: 'LandingHubStore',
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: this.redirectUrl,
                ipnUrl: this.ipnUrl,
                lang: lang,
                extraData: extraData,
                requestType: this.requestType,
                signature: signature,
                autoCapture: autoCapture
            };

            console.log('MOMO Payment Request:', {
                ...requestBody,
                secretKey: '***HIDDEN***'
            });

            const response = await axios.post(this.endpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('MOMO Payment Response:', response.data);

            if (response.data.resultCode === 0) {
                return {
                    success: true,
                    payUrl: response.data.payUrl,
                    deeplink: response.data.deeplink,
                    qrCodeUrl: response.data.qrCodeUrl,
                    orderId: orderId,
                    requestId: requestId,
                    message: response.data.message || 'Success'
                };
            } else {
                return {
                    success: false,
                    error: response.data.message || 'Payment creation failed',
                    resultCode: response.data.resultCode
                };
            }
        } catch (error) {
            console.error('MOMO Payment Error:', error.message);
            if (error.response) {
                console.error('MOMO Error Response:', error.response.data);
            }
            return {
                success: false,
                error: error.message || 'Network error'
            };
        }
    }

    /**
     * Verify IPN callback từ MOMO
     */
    verifyIPN(data) {
        try {
            const {
                partnerCode,
                orderId,
                requestId,
                amount,
                orderInfo,
                orderType,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
                signature
            } = data;

            // Raw signature for verification
            const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

            const expectedSignature = this.createSignature(rawSignature);

            if (signature !== expectedSignature) {
                return {
                    valid: false,
                    error: 'Invalid signature'
                };
            }

            return {
                valid: true,
                data: {
                    orderId,
                    transId,
                    amount,
                    resultCode,
                    message,
                    payType
                }
            };
        } catch (error) {
            console.error('MOMO IPN Verification Error:', error.message);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Kiểm tra trạng thái giao dịch
     */
    async queryTransaction(orderId, requestId) {
        try {
            const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;
            const signature = this.createSignature(rawSignature);

            const requestBody = {
                partnerCode: this.partnerCode,
                requestId: requestId,
                orderId: orderId,
                lang: 'vi',
                signature: signature
            };

            const queryEndpoint = process.env.MOMO_QUERY_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/query';

            const response = await axios.post(queryEndpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: response.data.resultCode === 0,
                data: response.data
            };
        } catch (error) {
            console.error('MOMO Query Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Hoàn tiền
     */
    async refund({
                     orderId,
                     requestId,
                     amount,
                     transId,
                     description = 'Hoàn tiền'
                 }) {
        try {
            const refundRequestId = `${requestId}_refund`;

            const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&description=${description}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${refundRequestId}&transId=${transId}`;
            const signature = this.createSignature(rawSignature);

            const requestBody = {
                partnerCode: this.partnerCode,
                orderId: orderId,
                requestId: refundRequestId,
                amount: amount,
                transId: transId,
                lang: 'vi',
                description: description,
                signature: signature
            };

            const refundEndpoint = process.env.MOMO_REFUND_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/refund';

            const response = await axios.post(refundEndpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: response.data.resultCode === 0,
                data: response.data,
                refundRequestId: refundRequestId
            };
        } catch (error) {
            console.error('MOMO Refund Error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new MomoService();