const express = require("express");
const router = express.Router();
const moment = require("moment");
const { VNPay } = require("vnpay");
const crypto = require("crypto"); // <-- Thêm crypto

// Cấu hình VNPay
const vnpay = new VNPay({
    tmnCode: "GJKNWF58",
    secureSecret: "HKPL22GQ8JFP620X09ZYNUGE8P49ROC1", // ❌ BƯỚC QUAN TRỌNG: ĐẢM BẢO KHÓA NÀY CHÍNH XÁC TỪ EMAIL CỦA BẠN
    vnpayHost: "https://sandbox.vnpayment.vn",
    testMode: true,
    hashAlgorithm: "sha512",
});

// ❌ BƯỚC QUAN TRỌNG: CẬP NHẬT URL NGÂN NGÀY MỖI KHI KHỞI ĐỘNG LẠI
// const vnp_ReturnUrl = "https://8b7d7433c6b2.ngrok-free.app/vnpay-return"; 
const vnp_ReturnUrl = "http://localhost:5000/api/payment/vnpay-return";


// ===== API tạo URL thanh toán =====
router.post("/create-payment", async (req, res) => {
    const { amount, bankCode, planId, duration, customer } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Amount không hợp lệ" });
    }

    const orderId = moment().format("YYYYMMDDHHmmss");
    const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    console.log("Đang tạo URL thanh toán với số tiền:", amount);

    try {
        const paymentUrl = await vnpay.buildPaymentUrl({
            vnp_Amount: parseInt(amount), 
            vnp_TxnRef: orderId,
            vnp_OrderInfo: `Thanh toan goi ${planId} trong ${duration} nam`,
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
// Hàm encode theo RFC 3986
function encodeRFC3986(str) {
    return encodeURIComponent(str)
        .replace(/!/g, "%21")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
        .replace(/\*/g, "%2A");
}

// ===== Hàm verify chữ ký VNPay =====
function verifyVNPAYSignature(query) {
    const secureSecret = "HKPL22GQ8JFP620X09ZYNUGE8P49ROC1";
    const vnp_SecureHash = query.vnp_SecureHash;

    const data = { ...query };
    delete data.vnp_SecureHash;
    delete data.vnp_SecureHashType;

    const sortedKeys = Object.keys(data).sort();
    const hashData = sortedKeys.map(key => `${key}=${encodeRFC3986(data[key])}`).join('&');

    const hmac = crypto.createHmac("sha512", secureSecret);
    const signed = hmac.update(Buffer.from(hashData, 'utf-8')).digest('hex');

    console.log("hashData:", hashData);
    console.log("Expected SecureHash from VNPay:", query.vnp_SecureHash);
    console.log("signed:", signed);
    console.log("vnp_SecureHash:", vnp_SecureHash);

    return signed === vnp_SecureHash;
}




// ===== API xử lý kết quả trả về từ VNPay =====
//Thay đổi đoạn code ở API xử lý kết quả trả về
// router.get("/vnpay-return", async (req, res) => {
//     console.log("VNPay return query:", req.query);
//     try {
//         const isVerified = vnpay.verifySignature(req.query);
//         console.log("Signature verified:", isVerified);

//         if (!isVerified) {
//             return res.send("<h2>❌ Sai chữ ký. Không hợp lệ.</h2>");
//         }

//         const vnpResponseCode = req.query.vnp_ResponseCode;
//         const txnRef = req.query.vnp_TxnRef;
//         const amount = req.query.vnp_Amount / 100;

//         if (vnpResponseCode === "00") {
//             return res.send(`<h2>✅ Thanh toán thành công!</h2>
//                              <p>Mã giao dịch: ${txnRef}</p>
//                              <p>Số tiền: ${amount} VND</p>`);
//         } else {
//             return res.send(`<h2>❌ Thanh toán thất bại!</h2>
//                              <p>Mã giao dịch: ${txnRef}</p>
//                              <p>Mã phản hồi: ${vnpResponseCode}</p>`);
//         }
//     } catch (error) {
//         console.error("Lỗi khi xử lý kết quả trả về:", error);
//         res.status(500).send("<h2>❌ Lỗi nội bộ khi xử lý kết quả.</h2>");
//     }
// });
// router.get("/vnpay-return", (req, res) => {
//     try {
//         // ✅ Sử dụng hàm tự viết
//         const isVerified = verifyVNPAYSignature(req.query);

//         let statusText = "❌ Thanh toán thất bại";
//         let vnpResponseCode = req.query.vnp_ResponseCode;
//         let txnRef = req.query.vnp_TxnRef;
//         let amount = req.query.vnp_Amount / 100;

//         if (isVerified && vnpResponseCode === "00") {
//             statusText = "✅ Thanh toán thành công";
//         }

//         const frontendUrl = `http://localhost:3001/payment-result?status=${encodeURIComponent(statusText)}&amount=${amount}&txnRef=${txnRef}&verified=${isVerified}`;
//         return res.redirect(frontendUrl);

//     } catch (err) {
//         console.error(err);
//         res.redirect(`http://localhost:3001/payment-result?status=${encodeURIComponent("❌ Lỗi khi xử lý giao dịch")}&verified=false`);
//     }
// });


router.get("/vnpay-return", (req, res) => {
    try {
        // Log toàn bộ query VNPay
        console.log("VNPay return query:", req.query);

        // Kiểm tra chữ ký
         const isVerified = verifyVNPAYSignature(req.query);
        console.log("Signature verified:", isVerified);

        // Chuẩn bị HTML debug
        let html = `<h1>VNPay Return Debug</h1>`;
        html += `<h2>Query Parameters:</h2><pre>${JSON.stringify(req.query, null, 2)}</pre>`;
        html += `<h2>Signature Verified: ${isVerified}</h2>`;

        if (!isVerified) {
            html += `<h2 style="color:red;">❌ Sai chữ ký. Dữ liệu không hợp lệ.</h2>`;
            return res.send(html);
        }

        // Kiểm tra kết quả thanh toán
        const vnpResponseCode = req.query.vnp_ResponseCode;
        const txnRef = req.query.vnp_TxnRef;
        const amount = req.query.vnp_Amount / 100; // VNPay trả về *100
        const statusColor = vnpResponseCode === "00" ? "green" : "red";
        const statusText = vnpResponseCode === "00" ? "✅ Thanh toán thành công!" : "❌ Thanh toán thất bại!";

        html += `<h2 style="color:${statusColor};">${statusText}</h2>`;
        html += `<p>Mã giao dịch: ${txnRef}</p>`;
        html += `<p>Số tiền: ${amount} VND</p>`;
        html += `<p>Mã phản hồi: ${vnpResponseCode}</p>`;

        res.send(html);

    } catch (error) {
        console.error("Lỗi khi xử lý kết quả trả về:", error);
        res.status(500).send(`<h2 style="color:red;">❌ Lỗi nội bộ khi xử lý kết quả.</h2><pre>${error}</pre>`);
    }
});

module.exports = router;