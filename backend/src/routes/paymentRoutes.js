import express from "express";
import { createVnpayPayment, vnpayReturn, vnpayIpn } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create", createVnpayPayment);
router.get("/vnpay_return", vnpayReturn);
router.get("/vnpay_ipn", vnpayIpn);

export default router;
