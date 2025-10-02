import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parseResume } from './resumeParser.js';
import { CareerCoachAgent } from './agent.js';
import { searchLinkedInJobs } from './jobSearch.js';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
await fs.mkdir(uploadsDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Store sessions in memory (in production, use a database)
const sessions = new Map();

// Routes
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const resumeText = await parseResume(req.file.path);
    const linkedInProfileUrl = req.body.linkedInProfileUrl || null;
    const sessionId = Date.now().toString();

    const agent = new CareerCoachAgent(resumeText, linkedInProfileUrl);
    sessions.set(sessionId, { agent, resumeText, linkedInProfileUrl });

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    const initialMessage = await agent.start();

    res.json({
      sessionId,
      message: initialMessage,
      resumeParsed: true,
      hasLinkedInProfile: !!linkedInProfileUrl
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ error: 'Failed to process resume' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);
    const response = await session.agent.processMessage(message);

    res.json({ message: response });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

app.post('/api/search-jobs', async (req, res) => {
  try {
    const { sessionId, location } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);
    const jobs = await searchLinkedInJobs(
      session.agent.getJobSearchCriteria(),
      location,
      session.resumeText,
      session.agent.linkedInProfile
    );

    res.json({ jobs });
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({ error: 'Failed to search jobs' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
