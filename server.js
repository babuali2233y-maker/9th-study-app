const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET_BEFORE_DEPLOYING";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function admin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: "Name, email and 6+ character password are required" });

  const normalized = email.trim().toLowerCase();
  const exists = db.prepare("SELECT id FROM users WHERE email=?").get(normalized);
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'student')")
    .run(name.trim(), normalized, hash);

  const user = { id: result.lastInsertRowid, name: name.trim(), email: normalized, role: "student" };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get((email || "").trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password_hash)))
    return res.status(401).json({ error: "Invalid email or password" });

  const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(safe, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: safe });
});

app.get("/api/me", auth, (req,res)=>res.json({user:req.user}));

app.get("/api/subjects", (req,res) => {
  res.json(db.prepare("SELECT * FROM subjects ORDER BY id").all());
});

app.get("/api/subjects/:id/chapters", (req,res) => {
  res.json(db.prepare("SELECT * FROM chapters WHERE subject_id=? ORDER BY id").all(req.params.id));
});

app.get("/api/notes", (req,res) => {
  const subjectId = req.query.subject_id;
  const rows = subjectId
    ? db.prepare(`SELECT n.*, s.name subject, c.title chapter
                  FROM notes n JOIN subjects s ON s.id=n.subject_id
                  LEFT JOIN chapters c ON c.id=n.chapter_id
                  WHERE n.subject_id=? ORDER BY n.id DESC`).all(subjectId)
    : db.prepare(`SELECT n.*, s.name subject, c.title chapter
                  FROM notes n JOIN subjects s ON s.id=n.subject_id
                  LEFT JOIN chapters c ON c.id=n.chapter_id
                  ORDER BY n.id DESC`).all();
  res.json(rows);
});

app.get("/api/questions", (req,res) => {
  const subjectId = req.query.subject_id;
  const rows = subjectId
    ? db.prepare("SELECT id,subject_id,question,option_a,option_b,option_c,option_d FROM questions WHERE subject_id=? ORDER BY id").all(subjectId)
    : db.prepare("SELECT id,subject_id,question,option_a,option_b,option_c,option_d FROM questions ORDER BY id").all();
  res.json(rows);
});

app.post("/api/quizzes/submit", auth, (req,res) => {
  const { answers=[] } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({error:"Invalid answers"});
  let score = 0;
  for (const item of answers) {
    const q = db.prepare("SELECT answer FROM questions WHERE id=?").get(item.question_id);
    if (q && Number(item.answer) === q.answer) score++;
  }
  db.prepare("INSERT INTO quiz_results(user_id,score,total) VALUES(?,?,?)")
    .run(req.user.id, score, answers.length);
  res.json({ score, total: answers.length });
});

app.get("/api/progress", auth, (req,res) => {
  const quiz = db.prepare("SELECT COUNT(*) attempts, COALESCE(MAX(CASE WHEN total>0 THEN ROUND(score*100.0/total) ELSE 0 END),0) best FROM quiz_results WHERE user_id=?").get(req.user.id);
  const progress = db.prepare("SELECT * FROM progress WHERE user_id=? ORDER BY updated_at DESC").all(req.user.id);
  res.json({ quiz, progress });
});

app.post("/api/progress", auth, (req,res) => {
  const { subject_id, percent } = req.body;
  const p = Math.max(0, Math.min(100, Number(percent)||0));
  db.prepare(`INSERT INTO progress(user_id,subject_id,percent,updated_at)
              VALUES(?,?,?,datetime('now'))
              ON CONFLICT(user_id,subject_id)
              DO UPDATE SET percent=excluded.percent,updated_at=datetime('now')`)
    .run(req.user.id, subject_id, p);
  res.json({ok:true});
});

app.post("/api/admin/notes", auth, admin, (req,res) => {
  const { subject_id, chapter_id, title, content } = req.body;
  if (!subject_id || !title || !content) return res.status(400).json({error:"Missing fields"});
  const r = db.prepare("INSERT INTO notes(subject_id,chapter_id,title,content) VALUES(?,?,?,?)")
    .run(subject_id, chapter_id || null, title, content);
  res.json({id:r.lastInsertRowid});
});

app.post("/api/admin/questions", auth, admin, (req,res) => {
  const { subject_id, question, options, answer } = req.body;
  if (!subject_id || !question || !Array.isArray(options) || options.length !== 4)
    return res.status(400).json({error:"Question needs four options"});
  const r = db.prepare(`INSERT INTO questions(subject_id,question,option_a,option_b,option_c,option_d,answer)
                        VALUES(?,?,?,?,?,?,?)`)
    .run(subject_id, question, ...options, Number(answer));
  res.json({id:r.lastInsertRowid});
});

app.get("*", (req,res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, ()=>console.log(`IX Study Hub running at http://localhost:${PORT}`));
