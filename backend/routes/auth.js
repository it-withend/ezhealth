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

// Google Fit OAuth callback - no authentication required (external callback from Google)
router.get('/google-fit/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log(`🔐 Google Fit OAuth callback - code: ${code ? 'present' : 'missing'}, state: ${state}, error: ${error}`);
    
    // Get userId from state or initData header
    const initData = req.headers['x-telegram-init-data'];
    let userId = null;
    
    if (state) {
      // State contains userId if passed from frontend
      userId = parseInt(state);
      console.log(`🔐 UserId from state: ${userId}`);
    } else if (initData) {
      // Extract userId from Telegram initData
      try {
        const params = new URLSearchParams(initData);
        const userParam = params.get('user');
        if (userParam) {
          const user = JSON.parse(decodeURIComponent(userParam));
          const telegramId = user.id;
          const userRecord = await dbGet('SELECT id FROM users WHERE telegram_id = ?', [telegramId]);
          if (userRecord) {
            userId = userRecord.id;
            console.log(`🔐 UserId from initData: ${userId} (telegramId: ${telegramId})`);
          }
        }
      } catch (err) {
        console.error('Error parsing initData:', err);
      }
    }
    
    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://ezhealthapp.netlify.app'}/health?error=oauth_denied&message=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      console.error('No authorization code received');
      return res.redirect(`${process.env.FRONTEND_URL || 'https://ezhealthapp.netlify.app'}/health?error=no_code`);
    }
    
    if (!userId) {
      console.error('No userId found - cannot save tokens');
      return res.redirect(`${process.env.FRONTEND_URL || 'https://ezhealthapp.netlify.app'}/health?error=no_user`);
    }
    
    // Exchange code for access token
    const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'https://ezhealth-l6zx.onrender.com'}/api/auth/google-fit/callback`;
    
    if (!clientId || !clientSecret) {
      console.error('Google Fit credentials not configured');
      return res.redirect(`${process.env.FRONTEND_URL || 'https://ezhealthapp.netlify.app'}/health?error=config_error`);
    }
    
    console.log(`🔐 Exchanging code for token...`);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://ezhealthapp.netlify.app'}/health?error=token_failed&message=${encodeURIComponent(tokens.error_description || tokens.error)}`);
    }
    
    console.log(`🔐 Token exchange successful - access_token: ${tokens.access_token ? 'present' : 'missing'}, refresh_token: ${tokens.refresh_token ? 'present' : 'missing'}`);
    
    // Save tokens to database
    await dbRun(
      `INSERT OR REPLACE INTO health_app_sync (user_id, app_name, access_token, refresh_token, sync_enabled)
       VALUES (?, 'google_fit', ?, ?, 1)`,
      [userId, tokens.access_token, tokens.refresh_token || null]
    );
    
    console.log(`✅ Google Fit connected for user ${userId}`);
    
    // Redirect back to app
    res.redirect(`${process.env.FRONTEND_URL || 'https://ezhealthapp.netlify.app'}/health?connected=google_fit&success=true`);
  } catch (error) {
    console.error('Google Fit OAuth callback error:', error);
    console.error('Error stack:', error.stack);
    res.redirect(`${process.env.FRONTEND_URL || 'https://ezhealthapp.netlify.app'}/health?error=server_error&message=${encodeURIComponent(error.message)}`);
  }
});

export default router;

