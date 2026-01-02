import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbGet, dbAll, dbRun } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const upload = multer({ 
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Apply authentication middleware to all routes
router.use(authenticate);

// Add medical analysis (with optional file upload)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { title, type, notes, date } = req.body;
    const user_id = req.userId;
    
    if (!title || !date) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.warn('Failed to cleanup file:', e);
        }
      }
      return res.status(400).json({ error: 'title and date are required' });
    }

    let file_path = null;
    let file_type = null;

    if (req.file) {
      // Generate unique filename
      const ext = path.extname(req.file.originalname);
      const newFilename = `${user_id}_${Date.now()}${ext}`;
      const newPath = path.join(uploadsDir, newFilename);
      
      // Move file to permanent location
      fs.renameSync(req.file.path, newPath);
      file_path = `/uploads/${newFilename}`;
      file_type = req.file.mimetype || ext;
    }

    const result = await dbRun(
      'INSERT INTO medical_analyses (user_id, title, type, file_path, file_type, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, title, type || null, file_path, file_type, notes || null, date]
    );

    res.json({
      success: true,
      analysis_id: result.lastID
    });
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('Failed to cleanup file on error:', e);
      }
    }
    console.error('Add analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all analyses
router.get('/', async (req, res) => {
  try {
    const userId = req.userId; // From authentication middleware
    const type = req.query.type;
    const limit = parseInt(req.query.limit) || 100;

    let sql = 'SELECT * FROM medical_analyses WHERE user_id = ?';
    const params = [userId];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY date DESC, created_at DESC LIMIT ?';
    params.push(limit);

    const analyses = await dbAll(sql, params);

    res.json({
      success: true,
      analyses
    });
  } catch (error) {
    console.error('Get analyses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single analysis
router.get('/:id', async (req, res) => {
  try {
    const analysisId = req.params.id;
    const userId = req.userId; // From authentication middleware

    const analysis = await dbGet(
      'SELECT * FROM medical_analyses WHERE id = ? AND user_id = ?',
      [analysisId, userId]
    );

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update analysis
router.put('/:id', async (req, res) => {
  try {
    const analysisId = req.params.id;
    const { title, type, file_path, file_type, notes, date } = req.body;
    const user_id = req.userId; // From authentication middleware

    await dbRun(
      'UPDATE medical_analyses SET title = ?, type = ?, file_path = ?, file_type = ?, notes = ?, date = ? WHERE id = ? AND user_id = ?',
      [title, type, file_path, file_type, notes, date, analysisId, user_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete analysis
router.delete('/:id', async (req, res) => {
  try {
    const analysisId = req.params.id;
    const userId = req.userId;

    // Get file path before deleting
    const analysis = await dbGet(
      'SELECT file_path FROM medical_analyses WHERE id = ? AND user_id = ?',
      [analysisId, userId]
    );

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Delete from database
    await dbRun(
      'DELETE FROM medical_analyses WHERE id = ? AND user_id = ?',
      [analysisId, userId]
    );

    // Delete file if exists
    if (analysis.file_path) {
      try {
        const filePath = path.join(__dirname, '..', analysis.file_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.warn('Failed to delete file:', fileError);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve uploaded files
router.get('/file/:filename', authenticate, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

