import express from "express";
import { googleLogin, signup } from "../controllers/authController.js";
import { createCheckoutSession } from "../stripe/Stripe.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/google-login", googleLogin);

router.post("/create-checkout-session", createCheckoutSession);

export default router;
