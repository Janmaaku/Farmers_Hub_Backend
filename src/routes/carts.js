import express from "express";
import { createOrderNumber, orderPaid, usersCartList } from "../carts/carts.js";

const router = express.Router();

router.post("/create-order-number", createOrderNumber);
router.get("/usersCartList", usersCartList);
router.post("/mark-paid", orderPaid);

export default router;
