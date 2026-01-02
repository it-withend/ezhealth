import express from 'express';
import { dbGet, dbAll, dbRun } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Add medical analysis
router.post('/', async (req, res) => {
  try {
    const { title, type, file_path, file_type, notes, date } = req.body;
    const user_id = req.userId; // From authentication middleware
    
    if (!title || !date) {
      return res.status(400).json({ error: 'title and date are required' });
    }

    const result = await dbRun(
      'INSERT INTO medical_analyses (user_id, title, type, file_path, file_type, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, title, type || null, file_path || null, file_type || null, notes || null, date]
    );

    res.json({
      success: true,
      analysis_id: result.lastID
    });
  } catch (error) {
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
    const userId = req.userId; // From authentication middleware

    await dbRun(
      'DELETE FROM medical_analyses WHERE id = ? AND user_id = ?',
      [analysisId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

