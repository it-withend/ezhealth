import express from 'express';
import { dbAll, dbRun, dbGet } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all trusted contacts for user
router.get('/', async (req, res) => {
  try {
    const userId = req.userId; // From authentication middleware
    console.log(`📋 Loading trusted contacts for user ${userId}`);

    const contacts = await dbAll(
      `SELECT * FROM trusted_contacts WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    
    console.log(`✅ Found ${contacts.length} contacts for user ${userId}`);
    res.json(contacts);
  } catch (error) {
    console.error("Error loading contacts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add trusted contact
router.post('/', async (req, res) => {
  try {
    const { contactTelegramId, contactName, canViewHealthData, canReceiveAlerts } = req.body;
    const userId = req.userId; // From authentication middleware
    
    if (!contactTelegramId) {
      return res.status(400).json({ error: 'contactTelegramId is required' });
    }

    // Store contactTelegramId as string (can be numeric ID or username)
    // Remove @ if present
    const telegramId = String(contactTelegramId).replace(/^@/, '').trim();

    // Check if contact already exists
    const existing = await dbGet(
      `SELECT * FROM trusted_contacts WHERE user_id = ? AND contact_telegram_id = ?`,
      [userId, telegramId]
    );

    if (existing) {
      return res.status(400).json({ error: 'Contact already exists' });
    }

    const result = await dbRun(
      `INSERT INTO trusted_contacts (user_id, contact_telegram_id, contact_name, can_view_health_data, can_receive_alerts) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, telegramId, contactName || null, canViewHealthData ? 1 : 0, canReceiveAlerts ? 1 : 0]
    );
    
    console.log(`✅ Trusted contact added: ${contactName} (${telegramId}) for user ${userId}`);
    res.status(201).json({ id: result.lastID, message: 'Contact added successfully' });
  } catch (error) {
    console.error('Error adding contact:', error);
    // Check for unique constraint violation
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'This contact is already in your trusted contacts list' });
    }
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

// Share health data with trusted contacts
router.post('/share', async (req, res) => {
  try {
    const userId = req.userId;
    const { dataType, dataId, contactIds } = req.body;

    if (!dataType) {
      return res.status(400).json({ error: 'dataType is required' });
    }

    // Get user's trusted contacts
    const contacts = await dbAll(
      `SELECT * FROM trusted_contacts WHERE user_id = ? AND can_view_health_data = 1`,
      [userId]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'No trusted contacts with view permissions found' });
    }

    // Filter by contactIds if provided
    const targetContacts = contactIds 
      ? contacts.filter(c => contactIds.includes(c.id))
      : contacts;

    // In production, send data via Telegram Bot API
    // For now, just log
    console.log(`📤 Sharing ${dataType} (ID: ${dataId || 'all'}) with ${targetContacts.length} contacts for user ${userId}`);
    targetContacts.forEach(contact => {
      console.log(`  - Contact: ${contact.contact_name || contact.contact_telegram_id} (ID: ${contact.id})`);
    });

    res.json({
      success: true,
      sharedWith: targetContacts.length,
      contacts: targetContacts.map(c => ({
        id: c.id,
        name: c.contact_name,
        telegramId: c.contact_telegram_id
      }))
    });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
