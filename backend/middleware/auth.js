import crypto from 'crypto';
import { dbGet } from '../database.js';

/**
 * Verify Telegram authentication from initData
 */
function verifyTelegramAuth(initData) {
  // Allow bypass in development mode
  if (process.env.NODE_ENV === 'development' && initData === 'dev_mode') {
    return { isValid: true, telegramId: 'dev_user' };
  }

  if (!initData) {
    return { isValid: false, error: 'No initData provided' };
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { isValid: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  try {
    // Parse initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return { isValid: false, error: 'No hash in initData' };
    }

    // Remove hash from params
    params.delete('hash');
    
    // Sort and create data check string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Calculate secret key
    const secretKey = crypto
      .createHash('sha256')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      return { isValid: false, error: 'Hash verification failed' };
    }

    // Extract user data
    const userStr = params.get('user');
    if (!userStr) {
      return { isValid: false, error: 'No user data in initData' };
    }

    const user = JSON.parse(userStr);
    return { isValid: true, telegramId: user.id.toString(), user };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Middleware to authenticate requests
 * Checks for user_id in query/body or Telegram initData in headers
 */
export async function authenticate(req, res, next) {
  try {
    // Method 1: Check for Telegram initData in headers (case-insensitive)
    const initData = req.headers['x-telegram-init-data'] || 
                     req.headers['X-Telegram-Init-Data'] ||
                     req.headers['x-telegram-initdata'] ||
                     req.headers['X-Telegram-InitData'];
    if (initData) {
      const verification = verifyTelegramAuth(initData);
      if (!verification.isValid) {
        return res.status(401).json({ error: 'Unauthorized', details: verification.error });
      }

      // Get user from database
      const user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [verification.telegramId]);
      if (!user) {
        return res.status(401).json({ error: 'User not found. Please authenticate first.' });
      }

      req.user = user;
      req.userId = user.id;
      return next();
    }

    // Method 2: Check for user_id in query or body (for backward compatibility)
    const userId = req.query.user_id || req.body.user_id;
    if (userId) {
      const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      req.userId = user.id;
      return next();
    }

    // No authentication provided
    return res.status(401).json({ error: 'Unauthorized. Please provide authentication.' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional authentication - doesn't fail if no auth provided
 * Useful for endpoints that work with or without auth
 */
export async function optionalAuthenticate(req, res, next) {
  try {
    const initData = req.headers['x-telegram-init-data'];
    if (initData) {
      const verification = verifyTelegramAuth(initData);
      if (verification.isValid) {
        const user = await dbGet('SELECT * FROM users WHERE telegram_id = ?', [verification.telegramId]);
        if (user) {
          req.user = user;
          req.userId = user.id;
        }
      }
    } else {
      const userId = req.query.user_id || req.body.user_id;
      if (userId) {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (user) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }
    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
}

