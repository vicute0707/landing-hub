// backend/routes/payment.js
const express = require("express");
const router = express.Router();
const moment = require("moment");

// Import thư viện VNPay
const { VNPay } = require("vnpay");

// Cấu hình VNPay (sử dụng thông tin bạn đã cung cấp)
const vnpay = new VNPay({
    tmnCode: "GJKNWF58",
    secureSecret: "HKPL22GQ8JFP620X09ZYNUGE8P49ROC1",
    vnpayHost: "https://sandbox.vnpayment.vn",
    testMode: true,
    hashAlgorithm: "sha512",
});

// vnp_ReturnUrl phải có đường dẫn khớp với router.get
// Ví dụ: https://abcd.ngrok-free.app/vnpay-return
const vnp_ReturnUrl = "https://c8f6c6628fed.ngrok-free.app/vnpay-return";
// const vnp_ReturnUrl = "https://c8f6c6628fed.ngrok-free.app/test-return";

// ===== Create payment URL =====
router.post("/create-payment", async (req, res) => {
    const { amount, bankCode } = req.body;
    if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: "Amount không hợp lệ" });
    }

    const orderId = moment().format("HHmmss");
    const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    try {
        const paymentUrl = await vnpay.buildPaymentUrl({
            vnp_Amount: parseInt(amount),
            vnp_TxnRef: orderId,
            vnp_OrderInfo: "Thanh toán đơn hàng demo",
            vnp_OrderType: "other",
            vnp_IpAddr: ipAddr,
            vnp_ReturnUrl: vnp_ReturnUrl,
            vnp_Locale: "vn",
            vnp_CreateDate: moment().format("YYYYMMDDHHmmss"),
            vnp_CurrCode: "VND",
            vnp_Command: "pay",
            vnp_Version: "2.1.0",
        });

        return res.json({ paymentUrl });
    } catch (error) {
        console.error("Lỗi khi tạo URL thanh toán:", error);
        return res.status(500).json({ error: "Lỗi nội bộ khi tạo URL thanh toán" });
    }
});

//===== Handle return from VNPay =====
router.get("/vnpay-return", async (req, res) => {
    try {
        // Sử dụng hàm xác thực của thư viện VNPay
        const isVerified = vnpay.verifySignature(req.query);

        if (isVerified) {
            // Chữ ký hợp lệ, tiếp tục kiểm tra mã phản hồi
            if (req.query.vnp_ResponseCode === "00") {
                // Thanh toán thành công
                res.send(`<h2>✅ Thanh toán thành công!</h2>
                          <p>Mã giao dịch: ${req.query.vnp_TxnRef}</p>
                          <p>Số tiền: ${req.query.vnp_Amount / 100} VND</p>`);
            } else {
                // Thanh toán thất bại
                res.send(`<h2>❌ Thanh toán thất bại!</h2>
                          <p>Mã giao dịch: ${req.query.vnp_TxnRef}</p>
                          <p>Mã phản hồi: ${req.query.vnp_ResponseCode}</p>`);
            }
        } else {
            // Chữ ký không hợp lệ, không tin cậy
            res.send("<h2>❌ Sai chữ ký. Không hợp lệ.</h2>");
        }
    } catch (error) {
        console.error("Lỗi khi xử lý kết quả trả về:", error);
        res.status(500).send("Lỗi nội bộ khi xử lý kết quả.");
    }
});


module.exports = router;