import express from 'express';
import { dbAll, dbRun, dbGet } from '../database.js';

const router = express.Router();

// Get all reminders for user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const reminders = await dbAll(
      `SELECT * FROM medications WHERE user_id = ? AND is_active = 1 ORDER BY reminder_time ASC`,
      [userId]
    );
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new reminder (medication)
router.post('/', async (req, res) => {
  try {
    const { userId, name, dosage, frequency, reminderTime } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await dbRun(
      `INSERT INTO medications (user_id, name, dosage, frequency, reminder_time) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, name, dosage, frequency, reminderTime]
    );
    res.status(201).json({ id: result.lastID, message: 'Reminder created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark medication as taken
router.post('/log', async (req, res) => {
  try {
    const { medicationId } = req.body;
    if (!medicationId) {
      return res.status(400).json({ error: 'Missing medicationId' });
    }

    const result = await dbRun(
      `INSERT INTO medication_logs (medication_id) VALUES (?)`,
      [medicationId]
    );
    res.status(201).json({ id: result.lastID, message: 'Medication logged' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reminder logs
router.get('/logs/:medicationId', async (req, res) => {
  try {
    const logs = await dbAll(
      `SELECT * FROM medication_logs WHERE medication_id = ? ORDER BY taken_at DESC`,
      [req.params.medicationId]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete reminder
router.delete('/:id', async (req, res) => {
  try {
    await dbRun(`UPDATE medications SET is_active = 0 WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
