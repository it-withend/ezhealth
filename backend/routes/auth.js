import express from 'express';
import crypto from 'crypto';
import { dbGet, dbRun } from '../database.js';

const router = express.Router();

// Verify Telegram authentication
function verifyTelegramAuth(authData) {
  // Allow bypass in development mode for browser testing
  if (process.env.NODE_ENV === 'development' && authData.hash === 'dev_mode_hash') {
    console.warn('⚠️ Development mode: Bypassing Telegram auth verification');
    return true;
  }
  
  const { hash, ...data } = authData;
  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
  
  const secretKey = crypto
    .createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN || '')
    .digest();
  
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return calculatedHash === hash;
}

// Login/Register with Telegram
router.post('/telegram', async (req, res) => {
  try {
    const authData = req.body;
    
    // Verify authentication
    if (!verifyTelegramAuth(authData)) {
      return res.status(401).json({ error: 'Invalid authentication data' });
    }

    const { id, first_name, last_name, username, photo_url } = authData;
    
    // Check if user exists
    let user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [id]);
    
    if (!user) {
      // Create new user
      const result = await dbRun(
        'INSERT INTO users (telegram_id, first_name, last_name, username, photo_url) VALUES (?, ?, ?, ?, ?)',
        [id, first_name || null, last_name || null, username || null, photo_url || null]
      );
      user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
    } else {
      // Update user info
      await dbRun(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
        [first_name || null, last_name || null, username || null, photo_url || null, id]
      );
      user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [id]);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const telegramId = req.query.telegram_id;
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    
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
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

