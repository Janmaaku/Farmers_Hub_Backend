import { adminDb } from "../config/firebase-admin.js";

export const analytics = async (req, res) => {
  try {
    // Fetch total users
    const usersSnapshot = await adminDb.collection("users").count().get();
    const totalUsers = usersSnapshot.data().count;

    // Fetch all carts/orders
    const cartsSnapshot = await adminDb.collection("carts").get();

    let ordersCompleted = 0;
    let ordersPending = 0;
    let totalRevenue = 0;
    let revenueToday = 0;
    let revenueThisMonth = 0;

    // Get today's date boundaries
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    cartsSnapshot.forEach((doc) => {
      const cart = doc.data();

      // Count orders by status
      if (cart.status === "COMPLETED") {
        ordersCompleted++;

        // Calculate revenue
        const orderAmount = cart.grandTotal || 0;
        totalRevenue += orderAmount;

        // Check if order was completed today
        if (cart.completedAt) {
          const completedDate = cart.completedAt.toDate();

          if (completedDate >= startOfToday) {
            revenueToday += orderAmount;
          }

          if (completedDate >= startOfMonth) {
            revenueThisMonth += orderAmount;
          }
        }
      } else if (cart.status === "CREATED") {
        ordersPending++;
      }
    });

    const analyticsData = {
      totalUsers,
      ordersCompleted,
      ordersPending,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueToday: Math.round(revenueToday * 100) / 100,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
    };

    console.log("analyticsData", analyticsData);
    res.json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      error: "Failed to fetch analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const analyticsCustom = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = adminDb.collection("carts").where("status", "==", "completed");

    if (startDate) {
      const start = new Date(startDate);
      query = query.where(
        "completedAt",
        ">=",
        adminDb.firestore.Timestamp.fromDate(start)
      );
    }

    if (endDate) {
      const end = new Date(endDate);
      query = query.where(
        "completedAt",
        "<=",
        adminDb.firestore.Timestamp.fromDate(end)
      );
    }

    const snapshot = await query.get();

    let revenue = 0;
    let orderCount = 0;

    snapshot.forEach((doc) => {
      const cart = doc.data();
      revenue += cart.totalAmount || 0;
      orderCount++;
    });

    res.json({
      orderCount,
      revenue: Math.round(revenue * 100) / 100,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error fetching custom analytics:", error);
    res.status(500).json({
      error: "Failed to fetch custom analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const analyticsOrders = async (req, res) => {
  try {
    const cartsSnapshot = await db.collection("carts").get();

    const statusCounts = {
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    const ordersByDate = {};

    cartsSnapshot.forEach((doc) => {
      const cart = doc.data();

      if (cart.status in statusCounts) {
        statusCounts[cart.status]++;
      }

      if (cart.completedAt) {
        const date = cart.completedAt.toDate().toISOString().split("T")[0];
        ordersByDate[date] = (ordersByDate[date] || 0) + 1;
      }
    });

    res.json({
      statusCounts,
      ordersByDate,
    });
  } catch (error) {
    console.error("Error fetching order analytics:", error);
    res.status(500).json({
      error: "Failed to fetch order analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
