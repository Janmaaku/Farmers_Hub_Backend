import express from "express";
import {
  analytics,
  analyticsCustom,
  analyticsOrders,
} from "../admin/analytics.js";

const router = express.Router();

router.get("/analytics", analytics);
router.get("/analytics/custom", analyticsCustom);
router.get("/analytics/orders", analyticsOrders);

export default router;
