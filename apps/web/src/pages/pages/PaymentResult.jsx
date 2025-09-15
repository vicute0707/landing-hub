import React from "react";
import { useLocation } from "react-router-dom";

export default function PaymentResult() {
  const query = new URLSearchParams(useLocation().search);
  const status = query.get("status");

  return (
    <div className="flex items-center justify-center min-h-screen">
      {status === "success" ? (
        <div className="text-green-600 text-xl font-bold">
          ✅ Nâng cấp thành công! Tài khoản của bạn đã là Premium.
        </div>
      ) : (
        <div className="text-red-600 text-xl font-bold">
          ❌ Thanh toán thất bại. Vui lòng thử lại.
        </div>
      )}
    </div>
  );
}
