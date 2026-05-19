const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");

require("dotenv").config();
const connectDB = require("./config/database");

const userRoutes = require("./routes/userRoute");
const errorHandler = require("./middleware/errorHandler");
const profileRouter = require("./routes/profile");
const sessionRoutes = require("./routes/sessionRoute");
const handRaiseRoute = require("./routes/handRaiseRoute");
const collaborativeEditorRoutes = require("./routes/collaborativeEditorRoute");
const executeCode = require("./routes/executeRoute");
const callRoutes = require("./routes/callRoute");
const aiRoutes = require("./routes/aiRoute");
const {
  handleCollaborativeEditor,
} = require("./sockets/collaborativeEditorSocket");
const { handleTerminalSocket } = require("./sockets/terminalSocket");

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    process.env.CLIENT_URL || "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      process.env.CLIENT_URL || "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true,
});

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.static("public"));

// Root route redirects to collaborative editor
app.get("/", (req, res) => {
  res.redirect("/collaborative-editor.html");
});

// Routes
app.use("/api/auth", userRoutes);
app.use("/api/", profileRouter);
app.use("/api/session", sessionRoutes);
app.use("/api/hand", handRaiseRoute);
app.use("/api/editor", executeCode);
app.use("/api/editor", collaborativeEditorRoutes);
app.use("/api/call", callRoutes);
app.use("/api/ai", aiRoutes);

// Initialize Socket.IO for collaborative editing
handleCollaborativeEditor(io);
handleTerminalSocket(io);
// Error Handling Middleware
app.use(errorHandler);

// Start server after DB connects
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server ready for collaborative editing`);
      console.log(`Access collaborative editor at: http://localhost:${PORT}`);
      console.log(`MongoDB connected successfully`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    // Start server anyway for development
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (without database)`);
      console.log(`Access collaborative editor at: http://localhost:${PORT}`);
      console.warn(
        "Warning: Some features may not work without database connection"
      );
    });
  });