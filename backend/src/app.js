import express from "express";
import healthRoutes from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import csv from "csv-parser";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(__dirname, 'uploads') });

app.use(express.json());

app.use("/health", healthRoutes);

app.use(errorHandler);

export default app;

//POST /auth/login


//POST /auth/register


//POST /imports
app.post("/imports", upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const transactions = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            transactions.push({
                id: row.id || Date.now().toString(),
                date: row.date,
                amount: parseFloat(row.amount),
                category: row.category,
                description: row.description
            });
        })
        .on('end', () => {
            // Read existing transactions
            const dataPath = path.join(__dirname, 'transactions.json');
            let existingTransactions = [];
            if (fs.existsSync(dataPath)) {
                const data = fs.readFileSync(dataPath, 'utf-8');
                existingTransactions = JSON.parse(data);
            }

            // Merge and save
            const updatedTransactions = existingTransactions.concat(transactions);
            fs.writeFileSync(dataPath, JSON.stringify(updatedTransactions, null, 2));

            // Clean up uploaded file
            fs.unlinkSync(filePath);

            res.json({ message: "CSV imported successfully", count: transactions.length });
        })
        .on('error', (error) => {
            res.status(500).json({ error: "Failed to process CSV", details: error.message });
        });
});

//POST /transactions/batch  
app.post("/transactions/batch", (req, res) => {
    const transactions = req.body.transactions;
    
    // Logic to save the batch of transactions to the database
    const data = fs.readFileSync(path.join(__dirname, 'transactions.json'), 'utf-8');
    const existingTransactions = JSON.parse(data);
    const updatedTransactions = existingTransactions.concat(transactions);
    fs.writeFileSync(path.join(__dirname, 'transactions.json'), JSON.stringify(updatedTransactions, null, 2));

    res.json({ message: "Batch of transactions has been saved", transactions });
});

//GET /transactions
app.get("/transactions", (req, res) => { 
    // Logic to fetch transactions from the database
    const data = fs.readFileSync(path.join(__dirname, 'transactions.json'), 'utf-8');
    const transactions = JSON.parse(data);
    res.json(transactions);
});

//GET /summary/monthly
app.get("/summary/monthly", (req, res) => {
    const { year, month } = req.query;
    const data = fs.readFileSync(path.join(__dirname, 'transactions.json'), 'utf-8');
    let transactions = JSON.parse(data);
    
    // Filter by specific month if parameters provided
    if (year && month) {
        transactions = transactions.filter(transaction => {
            const date = new Date(transaction.date);
            return date.getFullYear() === parseInt(year) && 
                   (date.getMonth() + 1) === parseInt(month);
        });
        
        const summary = { income: 0, expenses: 0 };
        transactions.forEach(transaction => {
            if (transaction.amount > 0) {
                summary.income += transaction.amount;
            } else {
                summary.expenses += Math.abs(transaction.amount);
            }
        });
        res.json(summary);
    } else {
        // If no month specified, return summary for all months
        const monthlySummary = transactions.reduce((summary, transaction) => {
            const month = new Date(transaction.date).toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!summary[month]) {
                summary[month] = { income: 0, expenses: 0 };
            }
            if (transaction.amount > 0) {
                summary[month].income += transaction.amount;
            } else {
                summary[month].expenses += Math.abs(transaction.amount);
            }
            return summary;
        }, {});
        res.json(monthlySummary);
    }
});

//PUT /transactions/:id
app.put("/transactions/:id", (req, res) => {
    const transactionId = req.params.id;
    const updatedData = req.body;
    
    // Logic to update the transaction in the database using transactionId and updatedData
    res.json({ message: `Transaction with ID ${transactionId} has been updated`, updatedData });
});

//DELETE /transactions/:id
app.delete("/transactions/:id", (req, res) => {
    const transactionId = req.params.id;
    
    // Logic to delete the transaction from the database using transactionId
    const data = fs.readFileSync(path.join(__dirname, 'transactions.json'), 'utf-8');
    let transactions = JSON.parse(data);
    transactions = transactions.filter(transaction => transaction.id !== transactionId);
    fs.writeFileSync(path.join(__dirname, 'transactions.json'), JSON.stringify(transactions, null, 2));

    res.json({ message: `Transaction with ID ${transactionId} has been deleted` });
});