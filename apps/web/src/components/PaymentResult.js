"use client"
import { useEffect, useState } from "react";

export default function PaymentResult() {
  const [status, setStatus] = useState("");
  const [amount, setAmount] = useState(0);
  const [txnRef, setTxnRef] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStatus(params.get("status") || "");
    setAmount(params.get("amount") || 0);
    setTxnRef(params.get("txnRef") || "");
    setVerified(params.get("verified") === "true");
  }, []);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Thông báo thanh toán</h1>
      <h2 style={{ color: verified ? "green" : "red" }}>{status}</h2>
      {txnRef && <p>Mã giao dịch: {txnRef}</p>}
      {amount && <p>Số tiền: {Number(amount).toLocaleString("vi-VN")} VND</p>}
      <button onClick={() => window.location.href = "/dashboard"}>Quay lại Dashboard</button>
    </div>
  );
}
