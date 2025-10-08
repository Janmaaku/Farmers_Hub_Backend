import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./src/routes/auth.js";
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
