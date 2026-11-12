import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pool from './config/db.js';
import { UPLOAD_ROOT, ensureUploadDirs } from './config/uploads.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import adminProgramContentRoutes from './routes/adminProgramContent.js';
import adminProgramsRoutes from './routes/adminPrograms.js';
import adminSchoolsRoutes from './routes/adminSchools.js';
import adminStudentsRoutes from './routes/adminStudents.js';
import authRoutes from './routes/auth.js';
import programsRoutes from './routes/programs.js';
import schoolsRoutes from './routes/schools.js';

dotenv.config();
ensureUploadDirs();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '256kb' }));

app.use(
  '/uploads',
  express.static(UPLOAD_ROOT, {
    fallthrough: false,
    maxAge: '7d',
    etag: true,
    index: false,
  })
);

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please slow down.',
    },
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/db-check', async (_req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ status: 'connected' });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/programs', programsRoutes);
app.use('/api/admin/schools', adminSchoolsRoutes);
app.use('/api/admin/students', adminStudentsRoutes);
app.use('/api/admin/programs', adminProgramsRoutes);
app.use('/api/admin/programs/:programId', adminProgramContentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
