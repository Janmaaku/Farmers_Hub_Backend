import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./src/routes/auth.js";
import stripeRoutes from "./src/routes/stripe.js";
import cartsRoutes from "./src/routes/carts.js";

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Your frontend URL (Vite default)
    credentials: true,
  })
);

// Middlewares
app.use(cors());
app.use(express.json());

// Root
app.get("/", (req, res) => {
  res.send("Backend API is running 🚀");
});

// Use routes
app.use("/api/auth", authRoutes);

app.use("/api/stripe", stripeRoutes);

app.use("/api/carts", cartsRoutes);
// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
