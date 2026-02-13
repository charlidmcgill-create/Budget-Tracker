import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import { config } from "./config/env.js";
import pool from "./db/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import csv from "csv-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(__dirname, 'uploads') });

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);

app.use(errorHandler);

export default app;

//POST /auth/login
app.post("/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // Find user in database
        const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = result.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: '24h' });

        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
        res.status(500).json({ error: "Login failed", details: error.message });
    }
});

//POST /auth/register
app.post("/auth/register", async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Validate input
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: "Username or email already exists" });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, passwordHash]
        );

        const newUser = result.rows[0];
        const token = jwt.sign({ id: newUser.id, username: newUser.username }, config.jwtSecret, { expiresIn: '24h' });

        res.status(201).json({ message: "User registered successfully", token, user: { id: newUser.id, username: newUser.username, email: newUser.email } });
    } catch (error) {
        res.status(500).json({ error: "Registration failed", details: error.message });
    }
});

//POST /imports
app.post("/imports", verifyToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        const transactions = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                transactions.push({
                    date: row.date,
                    amount: parseFloat(row.amount),
                    category: row.category,
                    description: row.description
                });
            })
            .on('end', async () => {
                try {
                    for (const transaction of transactions) {
                        await pool.query(
                            'INSERT INTO transactions (date, amount, category, description) VALUES ($1, $2, $3, $4)',
                            [transaction.date, transaction.amount, transaction.category, transaction.description]
                        );
                    }

                    // Clean up uploaded file
                    fs.unlinkSync(filePath);

                    res.json({ message: "CSV imported successfully", count: transactions.length });
                } catch (error) {
                    res.status(500).json({ error: "Failed to insert transactions", details: error.message });
                }
            })
            .on('error', (error) => {
                res.status(500).json({ error: "Failed to process CSV", details: error.message });
            });
    } catch (error) {
        res.status(500).json({ error: "Failed to upload file", details: error.message });
    }
});

//POST /transactions/batch  
app.post("/transactions/batch", verifyToken, async (req, res) => {
    try {
        const transactions = req.body.transactions;
        
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: "transactions must be a non-empty array" });
        }

        const results = [];
        for (const transaction of transactions) {
            const result = await pool.query(
                'INSERT INTO transactions (date, amount, category, description) VALUES ($1, $2, $3, $4) RETURNING id, date, amount, category, description',
                [transaction.date, transaction.amount, transaction.category, transaction.description]
            );
            results.push(result.rows[0]);
        }

        res.json({ message: "Batch of transactions has been saved", count: results.length, transactions: results });
    } catch (error) {
        res.status(500).json({ error: "Failed to save transactions", details: error.message });
    }
});

//GET /transactions
app.get("/transactions", verifyToken, async (req, res) => { 
    try {
        const result = await pool.query('SELECT id, date, amount, category, description FROM transactions ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch transactions", details: error.message });
    }
});

//GET /summary/monthly
app.get("/summary/monthly", verifyToken, async (req, res) => {
    try {
        const { year, month } = req.query;
        
        if (year && month) {
            // Get summary for specific month
            const result = await pool.query(
                `SELECT 
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
                FROM transactions
                WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
                [year, month]
            );
            const summary = result.rows[0];
            res.json({ income: summary.income || 0, expenses: summary.expenses || 0 });
        } else {
            // Get summary for all months
            const result = await pool.query(
                `SELECT 
                    TO_CHAR(date, 'Month YYYY') as month,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
                FROM transactions
                GROUP BY TO_CHAR(date, 'Month YYYY')
                ORDER BY MIN(date) DESC`
            );
            const monthlySummary = {};
            result.rows.forEach(row => {
                monthlySummary[row.month] = { income: row.income || 0, expenses: row.expenses || 0 };
            });
            res.json(monthlySummary);
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch summary", details: error.message });
    }
});

//PUT /transactions/:id
app.put("/transactions/:id", verifyToken, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const { date, amount, category, description } = req.body;
        
        const result = await pool.query(
            'UPDATE transactions SET date = COALESCE($1, date), amount = COALESCE($2, amount), category = COALESCE($3, category), description = COALESCE($4, description) WHERE id = $5 RETURNING *',
            [date, amount, category, description, transactionId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }
        
        res.json({ message: `Transaction with ID ${transactionId} has been updated`, transaction: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: "Failed to update transaction", details: error.message });
    }
});

//DELETE /transactions/:id
app.delete("/transactions/:id", verifyToken, async (req, res) => {
    try {
        const transactionId = req.params.id;
        
        const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING id', [transactionId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }
        
        res.json({ message: `Transaction with ID ${transactionId} has been deleted` });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete transaction", details: error.message });
    }
});