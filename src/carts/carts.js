import { adminAuth, adminDb, FieldValues } from "../config/firebase-admin.js";

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
};

export const createOrderNumber = async (req, res) => {
  try {
    const { user, cartItems, subtotal, shipping = 0, tax = 0 } = req.body;

    console.log("Create cart request:", req.body);
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart items are required" });
    }

    console.log("user", user);
    const orderNumber = generateOrderNumber();
    const now = new Date();

    const doc = {
      orderNumber,
      status: "CREATED",
      paymentStatus: "PENDING",
      user: user || null,
      cartItems,
      amounts: {
        subtotal: subtotal || 0,
        shipping,
        tax,
        total: (subtotal || 0) + shipping + tax,
        currency: "AUD",
      },

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

export const usersCartList = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const idToken = authHeader.split(" ")[1];

    // 1) Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2) Find cart doc where user.id == uid AND paymentStatus == "PENDING"
    const cartsRef = adminDb.collection("carts");
    const snapshot = await cartsRef
      .where("user.id", "==", uid)
      .where("paymentStatus", "==", "PENDING")
      // optional: if you have createdAt, uncomment:
      // .orderBy("createdAt", "desc")
      // .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        cartExists: false,
        cart: null,
      });
    }

    // If multiple docs, just take the first one (or the latest if ordered)
    const doc = snapshot.docs[0];
    const cartData = { id: doc.id, ...doc.data() };

    return res.json({
      success: true,
      cartExists: true,
      cart: cartData,
    });
  } catch (error) {
    console.error("Error fetching user cart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user cart",
    });
  }
};

export const orderPaid = async (req, res) => {
  try {
    const { orderNumber, grandTotal } = req.body;

    const numericGrandTotal = Number(grandTotal);

    if (!orderNumber || isNaN(numericGrandTotal)) {
      return res
        .status(400)
        .json({ error: "orderNumber and valid grandTotal are required" });
    }

    const snapshot = await adminDb
      .collection("carts")
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ error: `No cart found for orderNumber ${orderNumber}` });
    }

    const docRef = snapshot.docs[0].ref;

    await docRef.update({
      paymentStatus: "PAID",
      status: "COMPLETED",
      // 🔽 Save grandTotal into the nested amounts object
      grandTotal: numericGrandTotal, // optional separate field
      paymentUpdatedAt: FieldValues.serverTimestamp(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Error marking order as paid:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
