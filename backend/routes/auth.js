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
  
  // Check if bot token is configured - if not, allow bypass for development
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN is not configured - allowing bypass');
    return true; // Allow bypass if token not configured
  }
  
  // Check if hash exists
  if (!authData.hash) {
    console.error('No hash provided in auth data');
    return false;
  }
  
  const { hash, ...data } = authData;
  
  // Remove undefined/null values and sort keys
  const cleanData = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      cleanData[key] = data[key];
    }
  });
  
  // Create data check string
  const dataCheckString = Object.keys(cleanData)
    .sort()
    .map(key => `${key}=${cleanData[key]}`)
    .join('\n');
  
  // Calculate secret key from bot token
  const secretKey = crypto
    .createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();
  
  // Calculate hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  const isValid = calculatedHash === hash;
  
  if (!isValid) {
    console.error('Hash verification failed');
    console.error('Expected hash:', calculatedHash);
    console.error('Received hash:', hash);
    console.error('Data check string:', dataCheckString);
  }
  
  return isValid;
}

// Login/Register with Telegram
router.post('/telegram', async (req, res) => {
  try {
    const authData = req.body;
    
    console.log('Received auth request:', {
      id: authData.telegram_id || authData.id,
      first_name: authData.first_name,
      has_hash: !!authData.hash,
      auth_date: authData.auth_date
    });
    
    // Verify authentication (but allow bypass if token not configured)
    const authValid = verifyTelegramAuth(authData);
    if (!authValid && process.env.TELEGRAM_BOT_TOKEN) {
      console.error('Authentication verification failed');
      return res.status(401).json({ 
        error: 'Invalid authentication data',
        details: 'Hash verification failed. Check TELEGRAM_BOT_TOKEN configuration.'
      });
    }

    // Support both telegram_id and id fields
    const id = authData.telegram_id || authData.id;
    const { first_name, last_name, username, photo_url } = authData;
    
    if (!id) {
      return res.status(400).json({ error: 'User ID (telegram_id or id) is required' });
    }
    
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

