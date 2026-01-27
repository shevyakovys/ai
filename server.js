import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const DEFAULT_CATEGORIES = {
  expense: [
    "Еда",
    "Транспорт",
    "Дом",
    "Развлечения",
    "Здоровье",
    "Обучение",
    "Другое",
  ],
  income: ["Зарплата", "Фриланс", "Инвестиции", "Подарки"],
};

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(__dirname));

const runMigrations = async () => {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf-8");
  await pool.query(schemaSql);
};

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    await pool.query(
      "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4)",
      [userId, name, email, passwordHash]
    );

    const categoryValues = Object.entries(DEFAULT_CATEGORIES).flatMap(([type, items]) =>
      items.map((category) => [uuidv4(), userId, category, type, true])
    );

    const insertCategoryQuery =
      "INSERT INTO categories (id, user_id, name, type, is_default) VALUES ($1, $2, $3, $4, $5)";

    for (const values of categoryValues) {
      await pool.query(insertCategoryQuery, values);
    }

    const token = signToken({ id: userId, email });
    return res.json({ token });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (!result.rowCount) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({ token });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, avatar_url FROM users WHERE id = $1",
      [req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/me/avatar", authenticate, async (req, res) => {
  const { avatar } = req.body;
  try {
    await pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [avatar, req.user.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/public/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const userResult = await pool.query(
      "SELECT id, name, avatar_url FROM users WHERE id = $1",
      [userId]
    );
    if (!userResult.rowCount) {
      return res.status(404).json({ error: "User not found" });
    }

    const categoriesResult = await pool.query(
      "SELECT id, name, type, is_default FROM categories WHERE user_id = $1 ORDER BY created_at",
      [userId]
    );
    const expensesResult = await pool.query(
      "SELECT id, title, amount, spent_on, category_id, type FROM expenses WHERE user_id = $1 ORDER BY spent_on DESC",
      [userId]
    );

    return res.json({
      user: userResult.rows[0],
      categories: categoriesResult.rows,
      expenses: expensesResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/categories", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, type, is_default FROM categories WHERE user_id = $1 ORDER BY created_at",
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/categories", authenticate, async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: "Missing name" });
  }

  try {
    const exists = await pool.query(
      "SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND type = $3",
      [req.user.id, name, type]
    );
    if (exists.rowCount) {
      return res.status(409).json({ error: "Category already exists" });
    }

    const categoryId = uuidv4();
    await pool.query(
      "INSERT INTO categories (id, user_id, name, type, is_default) VALUES ($1, $2, $3, $4, $5)",
      [categoryId, req.user.id, name, type, false]
    );
    return res.json({ id: categoryId, name, type, is_default: false });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/categories/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = false",
      [id, req.user.id]
    );
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/expenses", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, amount, spent_on, category_id, type FROM expenses WHERE user_id = $1 ORDER BY spent_on DESC",
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/expenses", authenticate, async (req, res) => {
  const { title, amount, spent_on, category_id, type } = req.body;
  if (!title || !amount || !spent_on || !category_id || !type) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const id = uuidv4();
    await pool.query(
      "INSERT INTO expenses (id, user_id, category_id, title, amount, spent_on, type) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, req.user.id, category_id, title, amount, spent_on, type]
    );
    return res.json({ id, title, amount, spent_on, category_id, type });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/expenses/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [id, req.user.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/expenses", authenticate, async (req, res) => {
  try {
    await pool.query("DELETE FROM expenses WHERE user_id = $1", [req.user.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const port = process.env.PORT || 3000;
runMigrations()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to run migrations", error);
    process.exit(1);
  });
