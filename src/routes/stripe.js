import express from "express";
import {
  createCheckoutSession,
  createCodOrder,
  getCheckoutSession,
  getUserOrders,
  stripeWebhook,
  updateOrderStatus,
} from "../stripe/Stripe.js";
import { createPaymentIntent } from "../stripe/clientIntent.js";

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);
router.post("/create-cod-order", createCodOrder);
router.post("/stripe-webhook", stripeWebhook);
router.get("/get-checkout-session/:sessionId", getCheckoutSession);
router.get("/get-userOrders/:userId", getUserOrders);
router.patch("/update-order-status/:orderId", updateOrderStatus);

router.post("/client-payment-intent", createPaymentIntent);

export default router;
