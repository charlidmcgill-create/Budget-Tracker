import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3001,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/budget_tracker',
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
};