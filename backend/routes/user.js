import express from 'express';
import { dbGet, dbAll, dbRun } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authentication middleware

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trusted contacts
router.get('/trusted-contacts', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authentication middleware

    const contacts = await dbAll(
      'SELECT * FROM trusted_contacts WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add trusted contact
router.post('/trusted-contacts', authenticate, async (req, res) => {
  try {
    const { contact_telegram_id, contact_name, can_view_health_data, can_receive_alerts } = req.body;
    const user_id = req.userId; // From authentication middleware
    
    if (!contact_telegram_id) {
      return res.status(400).json({ error: 'contact_telegram_id is required' });
    }

    const result = await dbRun(
      'INSERT INTO trusted_contacts (user_id, contact_telegram_id, contact_name, can_view_health_data, can_receive_alerts) VALUES (?, ?, ?, ?, ?)',
      [user_id, contact_telegram_id, contact_name || null, can_view_health_data !== false ? 1 : 0, can_receive_alerts !== false ? 1 : 0]
    );

    res.json({
      success: true,
      contact_id: result.lastID
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove trusted contact
router.delete('/trusted-contacts/:id', authenticate, async (req, res) => {
  try {
    const contactId = req.params.id;
    const userId = req.userId; // From authentication middleware

    await dbRun(
      'DELETE FROM trusted_contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

