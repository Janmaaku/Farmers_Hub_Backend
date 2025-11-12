import { adminDb } from "../config/firebase-admin.js";

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
};

export const createOrderNumber = async (req, res) => {
  try {
    const {
      user,
      items,
      subtotal,
      shipping = 0,
      tax = 0,
      notes = "",
      meta = {},
    } = req.body;

    console.log("Create cart request:", req.body);
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart items are required" });
    }

    const orderNumber = generateOrderNumber();
    const now = new Date();

    const doc = {
      orderNumber,
      status: "CREATED",
      paymentStatus: "PENDING",
      user: user || null,
      items,
      amounts: {
        subtotal: subtotal || 0,
        shipping,
        tax,
        total: (subtotal || 0) + shipping + tax,
        currency: "AUD",
      },
      notes,
      meta,
      createdAt: now,
      updatedAt: now,
    };

    console.log("doc", doc);

    // ✅ Use .doc(orderNumber).set() instead of .add()
    await adminDb.collection("carts").doc(orderNumber).set(doc);

    return res.status(201).json({ id: orderNumber, orderNumber, ok: true });
  } catch (err) {
    console.error("Create cart error:", err.message);
    return res.status(500).json({ error: "Failed to create cart" });
  }
};
