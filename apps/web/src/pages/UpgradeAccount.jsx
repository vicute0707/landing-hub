import React, { useState } from "react";
import { createPayment } from "../services/paymentApi";

export default function UpgradeAccount() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    const { url } = await createPayment("user123", "premium_1month", 199000);
    window.location.href = url;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Nâng cấp tài khoản</h1>
      <div className="border p-6 rounded-lg shadow-md bg-white text-center">
        <p className="text-lg">Gói Premium 1 tháng</p>
        <p className="text-2xl font-bold text-blue-600 mb-4">199.000đ</p>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg shadow hover:bg-green-700"
        >
          {loading ? "Đang xử lý..." : "Thanh toán VNPay"}
        </button>
      </div>
    </div>
  );
}
