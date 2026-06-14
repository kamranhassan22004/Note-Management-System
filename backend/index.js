import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://note-management-system-um32.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors({
  origin: [
    "http://localhost:5173",
    "https://note-management-system-um32.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend working" });
});
// ── Connect MongoDB ───────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => { console.error("❌ MongoDB error:", err.message); process.exit(1); });

// ── Schemas ───────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:   { type: String, required: true },
  body:    { type: String, default: "" },
  color:   { type: String, default: "violet" },
  pinned:  { type: Boolean, default: false },
  tags:    [String],
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Note = mongoose.model("Note", noteSchema);

// ── Auth middleware ───────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ── Auth routes ───────────────────────────────────────────────────────────────
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be 6+ chars" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Summary route
app.post("/api/ai/summary", auth, async (req, res) => {
  try {
    const { notes } = req.body;
    const preview = notes.slice(0, 5).map((n) => `"${n.title}": ${n.body?.slice(0, 100)}`).join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Based on these notes, write a 2-sentence summary of what this person is focused on.\n\nNotes:\n${preview}` }]
          }]
        })
      }
    );

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate summary.";
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ── Notes routes (all protected) ──────────────────────────────────────────────
// GET all notes for logged-in user
app.get("/api/notes", auth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ pinned: -1, updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create note
app.post("/api/notes", auth, async (req, res) => {
  try {
    const { title, body, color, pinned, tags } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    const note = await Note.create({ user: req.user.id, title, body, color, pinned, tags });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update note
app.put("/api/notes/:id", auth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) return res.status(404).json({ error: "Note not found" });

    const { title, body, color, pinned, tags } = req.body;
    if (title !== undefined) note.title  = title;
    if (body  !== undefined) note.body   = body;
    if (color !== undefined) note.color  = color;
    if (pinned!== undefined) note.pinned = pinned;
    if (tags  !== undefined) note.tags   = tags;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE note
app.delete("/api/notes/:id", auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
