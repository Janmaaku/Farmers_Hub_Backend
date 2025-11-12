import Stripe from "stripe";

// Ensure your env has STRIPE_SECRET_KEY set (never expose to client)
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Util: convert floating subtotal to integer cents safely
function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

// Safe price parser: handles number, "12.50", "12.50 - Large", etc.
function parsePrice(val) {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const first = val.split(" - ")[0].trim();
    const n = Number(first);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// Safe quantity parser: defaults to 1
function parseQty(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Express handler
export const createPaymentIntent = async (req, res) => {
  try {
    const {
      items = [],
      shippingEstimate = 0,
      taxEstimate = 0,
      currency = "aud",
      metadata = {},
    } = req.body || {};

    console.log("Create PI request:", req.body);
    // Calculate subtotal from items on the server
    const subtotal = items.reduce((sum, item) => {
      const p = parseFloat(String(item.price).split(" - ")[0]) || 0;
      const q = Number(item.quantity) || 1;
      return sum + p * q;
    }, 0);

    // (Optional) You can recompute shipping/tax here if you prefer not to trust the client
    const orderTotal =
      subtotal + Number(shippingEstimate) + Number(taxEstimate);

    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return res.status(400).json({ error: "Invalid amount." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(orderTotal),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        // helpful for reconciling orders
        subtotal: String(subtotal),
        shippingEstimate: String(shippingEstimate),
        taxEstimate: String(taxEstimate),
        ...metadata,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: orderTotal,
      currency,
    });
  } catch (err) {
    console.error("Create PI error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};
