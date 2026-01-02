import express from 'express';
import { dbAll, dbRun, dbGet } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all reminders for user (medications + habits)
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    // Get medications
    const medications = await dbAll(
      `SELECT *, 'medication' as reminder_type FROM medications 
       WHERE user_id = ? AND is_active = 1 
       ORDER BY reminder_time ASC`,
      [userId]
    );

    // Get habits
    const habits = await dbAll(
      `SELECT *, 'habit' as reminder_type FROM habits 
       WHERE user_id = ? AND is_active = 1 
       ORDER BY reminder_time ASC`,
      [userId]
    );

    // Combine and format
    const reminders = [
      ...medications.map(m => ({
        id: m.id,
        type: 'medication',
        title: m.name,
        time: m.reminder_time,
        frequency: m.frequency,
        dosage: m.dosage,
        icon: '💊'
      })),
      ...habits.map(h => ({
        id: h.id,
        type: h.type,
        title: h.name,
        time: h.reminder_time,
        frequency: h.frequency,
        icon: h.type === 'water' ? '💧' : h.type === 'vitamin' ? '🌅' : h.type === 'walk' ? '🚶' : '✅'
      }))
    ].sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new reminder (medication or habit)
router.post('/', async (req, res) => {
  try {
    const { type, name, dosage, frequency, reminderTime } = req.body;
    const userId = req.userId;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    if (type === 'medication') {
      const result = await dbRun(
        `INSERT INTO medications (user_id, name, dosage, frequency, reminder_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, name, dosage || null, frequency || null, reminderTime || null]
      );
      res.status(201).json({ id: result.lastID, message: 'Medication reminder created', reminder_type: 'medication' });
    } else {
      // Habit (water, vitamin, walk, etc.)
      const result = await dbRun(
        `INSERT INTO habits (user_id, type, name, reminder_time, frequency) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, type, name, reminderTime || null, frequency || null]
      );
      res.status(201).json({ id: result.lastID, message: 'Habit reminder created', reminder_type: 'habit' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark medication as taken
router.post('/log', async (req, res) => {
  try {
    const { medicationId, habitId } = req.body;
    
    if (medicationId) {
      const result = await dbRun(
        `INSERT INTO medication_logs (medication_id) VALUES (?)`,
        [medicationId]
      );
      res.status(201).json({ id: result.lastID, message: 'Medication logged' });
    } else if (habitId) {
      const result = await dbRun(
        `INSERT INTO habit_logs (habit_id) VALUES (?)`,
        [habitId]
      );
      res.status(201).json({ id: result.lastID, message: 'Habit logged' });
    } else {
      return res.status(400).json({ error: 'medicationId or habitId is required' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reminder logs
router.get('/logs/:id', async (req, res) => {
  try {
    const { type } = req.query;
    const id = req.params.id;

    if (type === 'medication') {
      const logs = await dbAll(
        `SELECT * FROM medication_logs WHERE medication_id = ? ORDER BY taken_at DESC`,
        [id]
      );
      res.json(logs);
    } else if (type === 'habit') {
      const logs = await dbAll(
        `SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY completed_at DESC`,
        [id]
      );
      res.json(logs);
    } else {
      return res.status(400).json({ error: 'type query parameter is required (medication or habit)' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete reminder
router.delete('/:id', async (req, res) => {
  try {
    const { type } = req.query;
    const id = req.params.id;

    if (type === 'medication') {
      await dbRun(`UPDATE medications SET is_active = 0 WHERE id = ?`, [id]);
    } else if (type === 'habit') {
      await dbRun(`UPDATE habits SET is_active = 0 WHERE id = ?`, [id]);
    } else {
      return res.status(400).json({ error: 'type query parameter is required (medication or habit)' });
    }

    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
