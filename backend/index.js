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
const HOST = "0.0.0.0";

const missingEnv = ["MONGO_URI", "SECRET_KEY"].filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.warn(
    `Missing environment variables (set these in Render → Environment): ${missingEnv.join(", ")}`
  );
}

const startServer = (withDatabase) => {
  server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Socket.IO server ready for collaborative editing`);
    if (withDatabase) {
      console.log("MongoDB connected successfully");
    } else {
      console.warn(
        "Warning: Running without database — auth and persistence will not work"
      );
    }
  });
};

connectDB()
  .then(() => startServer(true))
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    startServer(false);
  });