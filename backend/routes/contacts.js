import express from 'express';
import { dbAll, dbRun, dbGet } from '../database.js';

const router = express.Router();

// Get all trusted contacts for user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const contacts = await dbAll(
      `SELECT * FROM trusted_contacts WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add trusted contact
router.post('/', async (req, res) => {
  try {
    const { userId, contactTelegramId, contactName, canViewHealthData, canReceiveAlerts } = req.body;
    if (!userId || !contactTelegramId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await dbRun(
      `INSERT INTO trusted_contacts (user_id, contact_telegram_id, contact_name, can_view_health_data, can_receive_alerts) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, contactTelegramId, contactName, canViewHealthData ? 1 : 0, canReceiveAlerts ? 1 : 0]
    );
    res.status(201).json({ id: result.lastID, message: 'Contact added' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update contact permissions
router.put('/:id', async (req, res) => {
  try {
    const { canViewHealthData, canReceiveAlerts } = req.body;
    await dbRun(
      `UPDATE trusted_contacts SET can_view_health_data = ?, can_receive_alerts = ? WHERE id = ?`,
      [canViewHealthData ? 1 : 0, canReceiveAlerts ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Contact updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove trusted contact
router.delete('/:id', async (req, res) => {
  try {
    await dbRun(`DELETE FROM trusted_contacts WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Contact removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
