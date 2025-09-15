export async function createPayment(userId, plan, amount) {
  const res = await fetch("/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, plan, amount }),
  });
  return res.json();
}
