import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import multer from "multer";
import { spawn } from "child_process"; // ✅ Import child_process to run Python script

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ✅ Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Save uploaded files in 'uploads' directory
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + Date.now() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// ✅ Route for ASL video upload & processing
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  // ✅ Run Python ASL recognition script
  const pythonProcess = spawn("python", ["asl/process_asl.py", req.file.path]);

  let result = "";
  pythonProcess.stdout.on("data", (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Error: ${data}`);
  });

  pythonProcess.on("close", (code) => {
    if (code === 0) {
      res.json({ message: "File processed successfully", text: result.trim() });
    } else {
      res.status(500).json({ message: "ASL processing failed" });
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ✅ Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("Server is running on PORT:" + PORT);
  connectDB();
});
