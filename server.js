const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dns = require("dns");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
dotenv.config();

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Brevo = require("@getbrevo/brevo");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "portfolio_secret_key_change_me";

// ===== SECURITY & SANITIZATION HELPERS =====
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").trim().slice(0, 1000);
}

function validateEmail(email) {
  return typeof email === "string" && VALID_EMAIL.test(email.trim());
}

function validateName(name) {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 100;
}

function validateSubject(subject) {
  return typeof subject === "string" && subject.trim().length >= 2 && subject.trim().length <= 200;
}

// ===== RATE LIMITING =====
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many submissions. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please try again later." },
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(express.static(__dirname));

// ===== SECURITY HEADERS =====
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ===== AUTH ROUTES =====

app.post("/api/signup", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    if (!validateName(name)) {
      return res.status(400).json({ error: "Invalid name." });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email already registered!" });
    }

    const user = await User.create({
      name: sanitize(name),
      email: email.trim().toLowerCase(),
      password,
    });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Signup Error:", error.message);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password!" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password!" });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: "Server error." });
  }
});

// ===== CONTACT FORM =====

app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const cleanName = sanitize(name);
    const cleanEmail = sanitize(email);
    const cleanSubject = sanitize(subject);
    const cleanMessage = sanitize(message);

    if (!validateName(cleanName)) {
      return res.status(400).json({ error: "Invalid name." });
    }
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email address." });
    }
    if (!validateSubject(cleanSubject)) {
      return res.status(400).json({ error: "Invalid subject." });
    }
    if (cleanMessage.length < 5) {
      return res.status(400).json({ error: "Message too short." });
    }

    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: "Portfolio Contact Form", email: "hafiztahirameen786@gmail.com" };
    sendSmtpEmail.replyTo = { name: cleanName, email: cleanEmail };
    sendSmtpEmail.to = [
      {
        email: process.env.TO_EMAIL,
        name: process.env.TO_NAME,
      },
    ];
    sendSmtpEmail.subject = `Portfolio Contact: ${cleanSubject}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">New Contact Form Message</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Name:</td><td style="padding: 8px;">${cleanName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Email:</td><td style="padding: 8px;">${cleanEmail}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #555;">Subject:</td><td style="padding: 8px;">${cleanSubject}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 16px 0;" />
        <p style="color: #333; line-height: 1.6;">${cleanMessage}</p>
        <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 16px 0;" />
        <p style="color: #999; font-size: 12px;">Sent from your portfolio website contact form.</p>
      </div>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(200).json({ success: true, messageId: result.body.messageId });
  } catch (error) {
    console.error("Brevo API Error:", error.message);
    res.status(500).json({ error: "Failed to send message. Please try again later." });
  }
});

// ===== 404 & FALLBACK ROUTES =====
app.get("/404.html", (req, res) => {
  res.status(404).sendFile(path.join(__dirname, "404.html"));
});

app.get("*", (req, res) => {
  // Only serve index.html for non-file requests
  if (!req.path.includes(".")) {
    res.sendFile(path.join(__dirname, "index.html"));
  } else {
    res.status(404).sendFile(path.join(__dirname, "404.html"));
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
