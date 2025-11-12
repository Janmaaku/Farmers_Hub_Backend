// Backend API endpoints for handling both Stripe and COD payments
// This should be in your backend server (e.g., Express.js)

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout Session
export const createCheckoutSession = async (req, res) => {
  try {
    const { cartItems, subtotal, shippingEstimate, taxEstimate, orderTotal } =
      req.body;

    // Validate that we have cart items
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Create line items for Stripe
    const lineItems = cartItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Shipping",
        },
        unit_amount: Math.round(shippingEstimate * 100),
      },
      quantity: 1,
    });

    // Add tax as a line item
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Tax",
        },
        unit_amount: Math.round(taxEstimate * 100),
      },
      quantity: 1,
    });

    // Construct proper URLs with explicit scheme
    let clientURL = process.env.CLIENT_URL;

    // If CLIENT_URL is not set, use localhost
    if (!clientURL) {
      clientURL = "http://localhost:5173";
      console.warn(
        "CLIENT_URL not set in environment variables, using default:",
        clientURL
      );
    }

    // Remove trailing slash if present
    clientURL = clientURL.replace(/\/$/, "");

    // Ensure URL has proper scheme
    if (!clientURL.startsWith("http://") && !clientURL.startsWith("https://")) {
      clientURL = `http://${clientURL}`;
      console.warn("Added http:// scheme to CLIENT_URL:", clientURL);
    }

    const successURL = `${clientURL}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelURL = `${clientURL}/payment-method`;

    // Log the URLs for debugging
    console.log("Creating Stripe session with URLs:", {
      success_url: successURL,
      cancel_url: cancelURL,
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successURL,
      cancel_url: cancelURL,
      metadata: {
        cartItems: JSON.stringify(cartItems),
        subtotal: subtotal.toString(),
        shipping: shippingEstimate.toString(),
        tax: taxEstimate.toString(),
        total: orderTotal.toString(),
        paymentMethod: "stripe",
      },
    });

    console.log("Stripe session created successfully:", session.id);
    res.json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message,
    });
  }
};
// Create Cash on Delivery Order
export const createCodOrder = async (req, res) => {
  try {
    const {
      cartItems,
      subtotal,
      shippingEstimate,
      taxEstimate,
      orderTotal,
      paymentMethod,
    } = req.body;

    // Generate a unique order ID
    const orderId = `COD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create order data
    const orderData = {
      orderId,
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "processing",
      cartItems,
      subtotal,
      shipping: shippingEstimate,
      tax: taxEstimate,
      total: orderTotal,
      createdAt: new Date(),
      // You can add customer info here from req.user if available
      // customerId: req.user?.id,
      // customerEmail: req.user?.email,
    };

    // TODO: Save orderData to your database
    console.log("COD Order created:", orderData);

    // Example: Save to MongoDB
    // const Order = require('./models/Order');
    // const newOrder = await Order.create(orderData);

    // Send confirmation email (optional)
    // await sendOrderConfirmationEmail(orderData);

    res.json({
      success: true,
      orderId: orderData.orderId,
      message: "Order placed successfully",
    });
  } catch (error) {
    console.error("Error creating COD order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
};

// Webhook to handle successful Stripe payments
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Retrieve the session with line items
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: ["line_items"],
      }
    );

    // Generate order ID for Stripe payment
    const orderId = `STRIPE-${Date.now()}-${session.id.slice(-8)}`;

    // Save order to your database
    const orderData = {
      orderId,
      sessionId: session.id,
      customerId: session.customer,
      paymentMethod: "stripe",
      paymentStatus: session.payment_status,
      orderStatus: "processing",
      amountTotal: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      cartItems: JSON.parse(session.metadata.cartItems),
      subtotal: parseFloat(session.metadata.subtotal),
      shipping: parseFloat(session.metadata.shipping),
      tax: parseFloat(session.metadata.tax),
      total: parseFloat(session.metadata.total),
      createdAt: new Date(session.created * 1000),
    };

    // TODO: Save orderData to your database
    console.log("Stripe Order completed:", orderData);

    // Example: Save to MongoDB
    // const Order = require('./models/Order');
    // await Order.create(orderData);

    // Send confirmation email (optional)
    // await sendOrderConfirmationEmail(orderData);
  }

  res.json({ received: true });
};

// Retrieve session details after successful payment
export const getCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });

    res.json(session);
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({ error: "Failed to retrieve session" });
  }
};

// Get all orders for a user (optional endpoint)
export const getUserOrders = async (req, res) => {
  try {
    // TODO: Get user ID from authentication middleware
    // const userId = req.user.id;

    // TODO: Fetch orders from database
    // const Order = require('./models/Order');
    // const orders = await Order.find({ customerId: userId }).sort({ createdAt: -1 });

    // res.json(orders);

    res.json({ message: "Orders endpoint - implement database query" });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// Update order status (for COD orders when delivered)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    // TODO: Update order in database
    // const Order = require('./models/Order');
    // const order = await Order.findOneAndUpdate(
    //   { orderId },
    //   { orderStatus, paymentStatus, updatedAt: new Date() },
    //   { new: true }
    // );

    // res.json(order);

    res.json({
      message: "Order status updated",
      orderId,
      orderStatus,
      paymentStatus,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
};
