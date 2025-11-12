// routes/payments.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

/**
 * items: [{ id, name, price, qty }]  // price in CENTS
 * shippingCents, taxCents: integers in CENTS
 * currency: e.g. "aud" | "usd"
 * customerEmail: optional
 * paymentIntentId: optional (update existing PI instead of creating a new one)
 */
export const createPaymentIntent = async (req, res) => {
  try {
    const {
      items = [],
      shippingCents = 0,
      taxCents = 0,
      currency = "aud",
      customerEmail,
      paymentIntentId,
    } = req.body || {};

    // Basic validation
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: { message: "Cart is empty." } });
    }
    if (![shippingCents, taxCents].every(Number.isInteger)) {
      return res
        .status(400)
        .json({ error: { message: "Invalid shipping/tax." } });
    }
    if (
      !items.every(
        (i) =>
          Number.isInteger(i.price) &&
          Number.isInteger(i.qty) &&
          i.price >= 0 &&
          i.qty > 0
      )
    ) {
      return res
        .status(400)
        .json({ error: { message: "Invalid item prices/qty." } });
    }

    // Always compute totals on the server (never trust client totals)
    const amount =
      items.reduce((sum, i) => sum + i.price * i.qty, 0) +
      shippingCents +
      taxCents;

    // Optional: accept an idempotency key from the client to avoid duplicates
    const idempotencyKey = String(req.headers["idempotency-key"] || "");

    let intent;
    if (paymentIntentId) {
      // Update an existing PaymentIntent (e.g., cart changed)
      intent = await stripe.paymentIntents.update(paymentIntentId, {
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        receipt_email: customerEmail,
        metadata: {
          source: "web_checkout",
          cart_items_count: String(items.length),
        },
      });
    } else {
      // Create a new PaymentIntent
      intent = await stripe.paymentIntents.create(
        {
          amount,
          currency,
          automatic_payment_methods: { enabled: true }, // for Payment Element
          receipt_email: customerEmail,
          metadata: {
            source: "web_checkout",
            cart_items_count: String(items.length),
          },
        },
        idempotencyKey ? { idempotencyKey } : undefined
      );
    }

    return res.json({
      id: intent.id,
      client_secret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
    });
  } catch (err) {
    console.error("Create/Update PI error:", err);
    return res
      .status(400)
      .json({
        error: { message: err?.message || "Failed to create PaymentIntent" },
      });
  }
};
