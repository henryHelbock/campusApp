import express from 'express';
import cors from 'cors';
import { issuesRouter } from './routes/issues';
import { lostFoundRouter } from './routes/lostFound';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/issues', issuesRouter);
app.use('/api/lost-found', lostFoundRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

app.listen(PORT, () => {
  console.log(`CampusApp API running on http://localhost:${PORT}`);
});

export default app;
