require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');

if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is required. Copy .env.example to .env and configure it.'); process.exit(1); }
if (!process.env.FRONTEND_URL) { console.error('FRONTEND_URL is required for the CORS policy.'); process.exit(1); }
connectDB();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());
app.get('/', (req, res) => res.json({ success: true, message: 'Student Management System API is running' }));
app.use('/api/students', studentRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
