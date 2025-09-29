import express from "express";
import { googleLogin, signup } from "../controllers/authController";

const router = express.Router();

router.post("/signup", signup);
router.post("/google-login", googleLogin);

export default router;
