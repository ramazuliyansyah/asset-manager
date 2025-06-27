// server.js
const express = require("express");
const mysql = require("mysql2/promise"); // Use promise-based API for async/await
const dotenv = require("dotenv");
const cors = require("cors"); // For handling Cross-Origin Resource Sharing
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken"); // For JSON Web Tokens

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default to 3000
const jwtSecret = process.env.JWT_SECRET || "supersecretjwtkey"; // Secret for signing JWTs

// Middleware
app.use(cors()); // Enable CORS for all routes, allowing frontend to connect
app.use(express.json()); // Parse JSON request bodies
app.use(express.static("public")); // Serve static files from the 'public' directory

// --- Database Connection Pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Max number of connections in the pool
  queueLimit: 0, // Unlimited queue for connection requests
});

// Test database connection
pool
  .getConnection()
  .then((connection) => {
    console.log("Successfully connected to MySQL database!");
    connection.release(); // Release the connection back to the pool
  })
  .catch((err) => {
    console.error("Failed to connect to MySQL database:", err);
    // Exit the process if database connection fails, as the app cannot function without it
    process.exit(1);
  });

// --- JWT Authentication Middleware ---
// This middleware will be used to protect routes that require authentication
const authenticateToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers["authorization"];
  // Format: 'Bearer TOKEN_STRING'
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    // If no token is provided, return 401 Unauthorized
    return res.status(401).json({ message: "Authentication token required" });
  }

  // Verify the token using the secret
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      // If token is invalid or expired, return 403 Forbidden
      console.error("JWT verification failed:", err.message);
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    // If token is valid, attach the user payload from the token to the request object
    req.user = user; // user will contain { id: userId, username: username }
    console.log("Authenticated user:", req.user.username, "ID:", req.user.id); // Debug: Confirm user is authenticated
    next(); // Proceed to the next middleware or route handler
  });
};

// --- Authentication Routes ---

// User Registration (Signup)
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 3 || password.length < 6) {
    return res.status(400).json({
      message:
        "Username must be at least 3 characters and password at least 6 characters.",
    });
  }
  try {
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Username already taken." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );
    res.status(201).json({
      message: "User registered successfully!",
      userId: result.insertId,
    });
  } catch (err) {
    console.error("Error during user registration:", err);
    res.status(500).json({
      message: "Server error during registration",
      error: err.message,
    });
  }
});

// User Login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }
  try {
    const [users] = await pool.execute(
      "SELECT id, username, password FROM users WHERE username = ?",
      [username]
    );
    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid username or password." });
    }
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password." });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username },
      jwtSecret,
      { expiresIn: "1h" }
    );
    res.json({ message: "Login successful!", token });
  } catch (err) {
    console.error("Error during user login:", err);
    res
      .status(500)
      .json({ message: "Server error during login", error: err.message });
  }
});

// --- API Routes for Assets (Protected by authenticateToken middleware) ---

// GET all assets for the authenticated user
app.get("/api/assets", authenticateToken, async (req, res) => {
  const userId = req.user.id; // Get user ID from the authenticated token
  try {
    console.log("Fetching all assets for user ID:", userId); // Debug: Confirm user ID
    const [rows] = await pool.execute(
      "SELECT * FROM assets WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching assets for user:", err);
    res
      .status(500)
      .json({ message: "Error fetching assets", error: err.message });
  }
});

// GET a single asset by ID for the authenticated user
app.get("/api/assets/:id", authenticateToken, async (req, res) => {
  // Added authenticateToken middleware here
  const { id } = req.params; // Asset ID from URL parameter
  const userId = req.user.id; // Get user ID from the authenticated token

  // Debugging: Log incoming request for single asset
  console.log(
    `Attempting to fetch single asset ID: ${id} for user ID: ${userId}`
  );

  try {
    // IMPORTANT: The SQL query now includes both asset ID AND user ID
    // This ensures a user can only fetch their own assets.
    const [rows] = await pool.execute(
      "SELECT * FROM assets WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (rows.length === 0) {
      // If no rows are found, it means either:
      // 1. No asset with that `id` exists.
      // 2. An asset with that `id` exists, but its `user_id` does not match the authenticated `userId`.
      // In both cases, for the requesting user, the asset is "not found".
      console.warn(
        `Fetch single asset failed: Asset ID ${id} not found or not owned by user ${userId}.`
      );
      return res
        .status(404)
        .json({ message: "Asset not found or not authorized to view" });
    }
    console.log(`Successfully fetched asset ID ${id} for user ${userId}.`);
    res.json(rows[0]); // Send the single asset as JSON response
  } catch (err) {
    console.error("Error fetching asset by ID:", err); // Log the actual database error
    res
      .status(500)
      .json({ message: "Error fetching asset", error: err.message });
  }
});

// POST new asset for the authenticated user
app.post("/api/assets", authenticateToken, async (req, res) => {
  const { name, type, value, acquisitionDate, location } = req.body;
  const userId = req.user.id; // Get user ID from the authenticated token

  if (!name || !type || !value || !acquisitionDate || !location) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    console.log("Adding asset for user ID:", userId, "Data:", req.body); // Debug: Confirm data and user
    const [result] = await pool.execute(
      "INSERT INTO assets (name, type, value, acquisition_date, location, user_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, type, value, acquisitionDate, location, userId]
    );
    res
      .status(201)
      .json({ message: "Asset added successfully!", assetId: result.insertId });
  } catch (err) {
    console.error("Error adding asset:", err);
    res.status(500).json({ message: "Error adding asset", error: err.message });
  }
});

// PUT update asset for the authenticated user
app.put("/api/assets/:id", authenticateToken, async (req, res) => {
  const { id } = req.params; // Asset ID from URL parameter
  const { name, type, value, acquisitionDate, location } = req.body; // Updated asset data from request body
  const userId = req.user.id; // User ID from the authenticated JWT payload

  // Debugging: Log incoming data
  console.log(`Attempting to update asset ID: ${id} for user ID: ${userId}`);
  console.log("Received body:", req.body);

  if (!name || !type || !value || !acquisitionDate || !location) {
    return res
      .status(400)
      .json({ message: "All fields are required for update." });
  }

  try {
    // IMPORTANT: The SQL query must include both asset ID AND user ID
    // This ensures a user can only update their own assets.
    const [result] = await pool.execute(
      "UPDATE assets SET name = ?, type = ?, value = ?, acquisition_date = ?, location = ? WHERE id = ? AND user_id = ?",
      [name, type, value, acquisitionDate, location, id, userId]
    );

    // Check if any rows were affected by the update
    if (result.affectedRows === 0) {
      console.warn(
        `Update failed: Asset ID ${id} not found or not owned by user ${userId}.`
      );
      return res
        .status(404)
        .json({ message: "Asset not found or not authorized to update" });
    }
    console.log(`Asset ID ${id} updated successfully by user ${userId}.`); // Debug: Confirm success
    res.json({ message: "Asset updated successfully!" });
  } catch (err) {
    console.error("Error updating asset:", err); // Log the actual database error
    res
      .status(500)
      .json({ message: "Error updating asset", error: err.message });
  }
});

// DELETE asset for the authenticated user
app.delete("/api/assets/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    console.log(`Attempting to delete asset ID: ${id} for user ID: ${userId}`);
    const [result] = await pool.execute(
      "DELETE FROM assets WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      console.warn(
        `Delete failed: Asset ID ${id} not found or not owned by user ${userId}.`
      );
      return res
        .status(404)
        .json({ message: "Asset not found or not authorized to delete" });
    }
    console.log(`Asset ID ${id} deleted successfully by user ${userId}.`);
    res.json({ message: "Asset deleted successfully!" });
  } catch (err) {
    console.error("Error deleting asset:", err);
    res
      .status(500)
      .json({ message: "Error deleting asset", error: err.message });
  }
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).send("404: Page Not Found");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Frontend accessible at http://localhost:${port}`);
});
