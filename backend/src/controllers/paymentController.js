import crypto from "crypto";
import moment from "moment";
import querystring from "qs";
import db from "../db.js";

const vnp_TmnCode = process.env.VNP_TMNCODE;
const vnp_HashSecret = process.env.VNP_HASHSECRET;
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const vnp_ReturnUrl = "http://localhost:3000/api/payment/vnpay_return";
const vnp_IpnUrl = "http://localhost:3000/api/payment/vnpay_ipn";

// 1. Tạo payment
export const createPayment = async (req, res) => {
  const { user_id, plan, amount } = req.body;
  const payment_id = crypto.randomUUID();

  await db("payments").insert({
    payment_id,
    user_id,
    plan,
    amount,
    method: "vnpay",
    status: "pending",
  });

  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: vnp_TmnCode,
    vnp_Amount: amount * 100,
    vnp_CreateDate: moment().format("YYYYMMDDHHmmss"),
    vnp_CurrCode: "VND",
    vnp_IpAddr: req.ip,
    vnp_Locale: "vn",
    vnp_OrderInfo: `Nang cap tai khoan ${plan}`,
    vnp_OrderType: "billpayment",
    vnp_ReturnUrl: vnp_ReturnUrl,
    vnp_TxnRef: payment_id,
  };

  vnp_Params = sortObject(vnp_Params);
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
  vnp_Params["vnp_SecureHash"] = signed;

  const paymentUrl = `${vnp_Url}?${querystring.stringify(vnp_Params, { encode: false })}`;
  res.json({ url: paymentUrl });
};

// 2. Return URL
export const vnpayReturn = async (req, res) => {
  handleVnpayCallback(req.query);
  res.redirect(`/payment-result?status=${req.query.vnp_ResponseCode === "00" ? "success" : "failed"}`);
};

// 3. IPN (VNPay gọi server)
export const vnpayIpn = async (req, res) => {
  handleVnpayCallback(req.query);
  res.json({ RspCode: "00", Message: "IPN Processed" });
};

// 4. Xử lý callback chung
async function handleVnpayCallback(vnp_Params) {
  const secureHash = vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  const signData = querystring.stringify(sortObject(vnp_Params), { encode: false });
  const hmac = crypto.createHmac("sha512", vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const paymentId = vnp_Params["vnp_TxnRef"];
  if (secureHash === signed && vnp_Params["vnp_ResponseCode"] === "00") {
    await db("payments").where({ payment_id: paymentId }).update({ status: "success" });
    const payment = await db("payments").where({ payment_id: paymentId }).first();

    // cập nhật user
    await db("users").where({ user_id: payment.user_id }).update({
      role: "premium",
      plan: payment.plan,
      plan_expired: moment().add(1, "months").toDate(),
    });
  } else {
    await db("payments").where({ payment_id: paymentId }).update({ status: "failed" });
  }
}

function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => ((result[key] = obj[key]), result), {});
}
