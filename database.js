const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const dir = path.join(__dirname, "data");
fs.mkdirSync(dir, { recursive: true });
const db = new Database(path.join(dir, "study.db"));

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS notes(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  chapter_id INTEGER,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS questions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  answer INTEGER NOT NULL,
  FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS quiz_results(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS progress(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  percent INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, subject_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(subject_id) REFERENCES subjects(id)
);
`);

const count = db.prepare("SELECT COUNT(*) c FROM subjects").get().c;
if (count === 0) {
  const addSubject = db.prepare("INSERT INTO subjects(name,icon) VALUES(?,?)");
  const subjects = [
    ["Mathematics","🧮"],["Physics","🔬"],["Chemistry","⚗️"],["Biology","🧬"],
    ["English","📖"],["Sindhi","سنڌي"],["Urdu","ا"],["Islamiat","☪️"]
  ];
  const ids = {};
  const tx = db.transaction(()=>{
    for (const [name,icon] of subjects) ids[name]=addSubject.run(name,icon).lastInsertRowid;
  });
  tx();

  const addChapter = db.prepare("INSERT INTO chapters(subject_id,title) VALUES(?,?)");
  const chapters = {
    Mathematics:["Real Numbers","Algebraic Expressions","Factorization","Linear Equations"],
    Physics:["Physical Quantities","Kinematics","Dynamics","Turning Effect of Forces"],
    Chemistry:["Fundamentals of Chemistry","Structure of Atoms","Periodic Table","Chemical Bonding"],
    Biology:["Introduction to Biology","Solving a Biological Problem","Biodiversity","Cells"],
    English:["Reading Skills","Grammar","Vocabulary","Writing Skills"],
    Sindhi:["نثر","نظم","قواعد","اهم سوال"],
    Urdu:["نثر","نظم","قواعد","اہم سوالات"],
    Islamiat:["قرآن مجيد","احاديث مبارکہ","سیرت النبی ﷺ","اسلامی اخلاق"]
  };
  for (const [subject,list] of Object.entries(chapters))
    for (const title of list) addChapter.run(ids[subject],title);

  const addQ = db.prepare(`INSERT INTO questions(subject_id,question,option_a,option_b,option_c,option_d,answer)
                           VALUES(?,?,?,?,?,?,?)`);
  const math=ids.Mathematics, physics=ids.Physics, chemistry=ids.Chemistry, biology=ids.Biology;
  [
    [math,"Which number is prime?","4","6","7","9",2],
    [math,"How many sides does a triangle have?","2","3","4","5",1],
    [physics,"SI unit of length is?","Kilogram","Metre","Second","Newton",1],
    [chemistry,"H2O is the formula for?","Oxygen","Water","Hydrogen","Carbon",1],
    [biology,"Powerhouse of the cell is?","Nucleus","Mitochondria","Ribosome","Cell wall",1]
  ].forEach(x=>addQ.run(...x));

  const adminHash = bcrypt.hashSync("Admin@123",10);
  db.prepare("INSERT OR IGNORE INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')")
    .run("Administrator","admin@ixstudy.local",adminHash);
}

module.exports = db;
