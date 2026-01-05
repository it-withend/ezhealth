import express from 'express';
import { dbGet, dbAll, dbRun } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build name from first_name and last_name (saved name)
    const savedName = user.first_name || user.last_name 
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
      : '';
    
    res.json({
      success: true,
      profile: {
        id: user.id,
        name: savedName,
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.date_of_birth || '',
        bloodType: user.blood_type || '',
        allergies: user.allergies || '',
        medicalConditions: user.medical_conditions || '',
        telegram_id: user.telegram_id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        photo_url: user.photo_url
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, phone, dateOfBirth, bloodType, allergies, medicalConditions } = req.body;

    // Parse name into first_name and last_name
    const nameParts = (name || '').trim().split(' ');
    const first_name = nameParts[0] || null;
    const last_name = nameParts.slice(1).join(' ') || null;

    // Update only provided fields (don't overwrite with null if field is empty string)
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('first_name = ?');
      updates.push('last_name = ?');
      values.push(first_name);
      values.push(last_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email || null);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }
    if (dateOfBirth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(dateOfBirth || null);
    }
    if (bloodType !== undefined) {
      updates.push('blood_type = ?');
      values.push(bloodType || null);
    }
    if (allergies !== undefined) {
      updates.push('allergies = ?');
      values.push(allergies || null);
    }
    if (medicalConditions !== undefined) {
      updates.push('medical_conditions = ?');
      values.push(medicalConditions || null);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    if (updates.length > 1) { // More than just updated_at
      await dbRun(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    console.log(`✅ Profile updated for user ${userId}`);
    
    // Return updated profile
    const updatedUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: {
        id: updatedUser.id,
        name: updatedUser.first_name || updatedUser.last_name ? `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim() : 'User',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        dateOfBirth: updatedUser.date_of_birth || '',
        bloodType: updatedUser.blood_type || '',
        allergies: updatedUser.allergies || '',
        medicalConditions: updatedUser.medical_conditions || '',
        telegram_id: updatedUser.telegram_id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        username: updatedUser.username,
        photo_url: updatedUser.photo_url
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
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

