// const express = require("express");
// const router = express.Router();
// const moment = require("moment");
// const { VNPay } = require("vnpay");
// const User = require("../models/User");
// const Payment = require("../models/Payment");

// // Cấu hình VNPay
// const vnpay = new VNPay({
//     tmnCode: "GJKNWF58",
//     secureSecret: "HKPL22GQ8JFP620X09ZYNUGE8P49ROC1",
//     vnpayHost: "https://sandbox.vnpayment.vn",
//     testMode: true,
//     hashAlgorithm: "sha512",
// });

// // URL trả về VNPay (cập nhật nếu chạy local/ngrok)
// const vnp_ReturnUrl = "https://7e4b1c88c635.ngrok-free.app/vnpay-return";

// // ===== API tạo URL thanh toán =====
// router.post("/create-payment", async (req, res) => {
//     const { amount, planId, duration, customer } = req.body;
//     const userEmail = customer?.email;

//     if (!amount || isNaN(amount) || amount <= 0) {
//         return res.status(400).json({ error: "Amount không hợp lệ" });
//     }

//     const orderId = moment().format("YYYYMMDDHHmmss");
//     const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

//     console.log("Đang tạo URL thanh toán với số tiền:", amount);

//     // Tạo Payment record với trạng thái pending
//     const payment = new Payment({
//         userEmail,
//         planId,
//         amount,
//         duration,
//         transactionRef: orderId,
//     });
//     await payment.save();

//     try {
//         const paymentUrl = await vnpay.buildPaymentUrl({
//             vnp_Amount: parseInt(amount),
//             vnp_TxnRef: orderId,
//             vnp_OrderInfo: `Thanh toan goi ${planId} trong ${duration} nam`,
//             vnp_OrderType: "other",
//             vnp_IpAddr: ipAddr,
//             vnp_ReturnUrl: vnp_ReturnUrl,
//             vnp_Locale: "vn",
//             vnp_CreateDate: moment().format("YYYYMMDDHHmmss"),
//             vnp_CurrCode: "VND",
//             vnp_Command: "pay",
//             vnp_Version: "2.1.0",
//         });

//         return res.json({ paymentUrl });
//     } catch (error) {
//         console.error("Lỗi khi tạo URL thanh toán:", error);
//         return res.status(500).json({ error: "Lỗi nội bộ khi tạo URL thanh toán" });
//     }
// });

// // ===== API xử lý kết quả trả về từ VNPay =====
// router.get("/vnpay-return", async (req, res) => {
//     try {
//         console.log("VNPay return query:", req.query);

//         const isVerified = vnpay.verifySignature(req.query);
//         if (!isVerified) {
//             return res.send("<h2 style='color:red;'>❌ Sai chữ ký. Dữ liệu không hợp lệ.</h2>");
//         }

//         const { vnp_ResponseCode, vnp_TxnRef, vnp_Amount } = req.query;

//         // Tìm Payment record theo transactionRef
//         const payment = await Payment.findOne({ transactionRef: vnp_TxnRef });
//         if (!payment) return res.send("<h2>❌ Không tìm thấy giao dịch.</h2>");

//         let html = `<h1>VNPay Return Debug</h1>`;
//         html += `<pre>${JSON.stringify(req.query, null, 2)}</pre>`;

//         if (vnp_ResponseCode === "00") {
//             // Thanh toán thành công
//             payment.status = "success";
//             payment.completedAt = new Date();
//             await payment.save();

//             // Cập nhật subscription của user
//             const user = await User.findOne({ email: payment.userEmail });
//             if (user && payment.planId === "premium") {
//                 user.subscription = "premium";
//                 await user.save();
//                 console.log(`User ${user.email} đã chuyển sang gói Premium`);
//             }

//             html += `<h2 style="color:green;">✅ Thanh toán thành công!</h2>`;
//             html += `<p>Mã giao dịch: ${vnp_TxnRef}</p>`;
//             html += `<p>Số tiền: ${vnp_Amount / 100} VND</p>`;
//         } else {
//             // Thanh toán thất bại
//             payment.status = "failed";
//             await payment.save();

//             html += `<h2 style="color:red;">❌ Thanh toán thất bại!</h2>`;
//             html += `<p>Mã giao dịch: ${vnp_TxnRef}</p>`;
//             html += `<p>Mã phản hồi: ${vnp_ResponseCode}</p>`;
//         }

//         res.send(html);

//     } catch (err) {
//         console.error("Lỗi khi xử lý kết quả trả về:", err);
//         res.status(500).send(`<h2 style="color:red;">❌ Lỗi nội bộ khi xử lý kết quả.</h2><pre>${err}</pre>`);
//     }
// });

// module.exports = router;
