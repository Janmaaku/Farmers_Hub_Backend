import express from "express";
import { createOrderNumber } from "../carts/carts.js";

const router = express.Router();

router.post("/create-order-number", createOrderNumber);

export default router;
