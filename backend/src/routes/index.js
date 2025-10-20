import express from 'express';
import { txLimiter } from '../middleware/security.js';
import { pool } from '../models/db.js';
import { getLatestBlock, submitTransaction, getTransaction, getAddressBalance } from '../services/bridge-client.js';
import { generateWalletAddresses, validateTAddress } from '../services/address-generator.js';
import { exportPrivateKey, getBalance as getSimpleBalance } from '../services/zcash-simple.js';

const router = express.Router();

// GET /api/blocks/head - Get current blockchain head
router.get('/blocks/head', async (req, res, next) => {
  try {
    const blockInfo = await getLatestBlock();
    res.json(blockInfo);
  } catch (error) {
    console.error('Error fetching latest block:', error);
    next(error);
  }
});

// POST /api/tx/submit - Submit a signed transaction
router.post('/tx/submit', txLimiter, async (req, res, next) => {
  try {
    const { rawTxHex, userId, metadata } = req.body;

    if (!rawTxHex || !userId) {
      return res.status(400).json({ error: 'Missing required fields: rawTxHex, userId' });
    }

    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(rawTxHex)) {
      return res.status(400).json({ error: 'Invalid rawTxHex format' });
    }

    // Submit to bridge (which forwards to lightwalletd)
    const txResult = await submitTransaction(rawTxHex);

    if (!txResult.success) {
      return res.status(400).json({
        success: false,
        error: txResult.error || 'Transaction rejected by network',
      });
    }

    // Log transaction to database
    const result = await pool.query(
      `INSERT INTO tx_log (user_id, txid, direction, amount_zats, to_addr, memo, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, txid, status, created_at`,
      [
        userId,
        txResult.txid,
        metadata?.direction || 'outgoing',
        metadata?.amount_zats || 0,
        metadata?.to_addr || null,
        metadata?.memo || null,
        'pending',
      ]
    );

    res.json({
      success: true,
      txid: txResult.txid,
      status: 'pending',
      ...result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tx/:txid - Get transaction status
router.get('/tx/:txid', async (req, res, next) => {
  try {
    const { txid } = req.params;

    const result = await pool.query(
      'SELECT * FROM tx_log WHERE txid = $1',
      [txid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/tx/user/:userId - Get user transaction history
router.get('/tx/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM tx_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      transactions: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users - Create new user
router.post('/users', async (req, res, next) => {
  try {
    const result = await pool.query(
      'INSERT INTO users DEFAULT VALUES RETURNING id, created_at'
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/credentials - Register device credential
router.post('/credentials', async (req, res, next) => {
  try {
    const { userId, credentialId, publicKey, deviceName } = req.body;

    if (!userId || !credentialId || !publicKey) {
      return res.status(400).json({
        error: 'Missing required fields: userId, credentialId, publicKey'
      });
    }

    const result = await pool.query(
      `INSERT INTO device_credentials (user_id, credential_id, public_key, device_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [userId, credentialId, publicKey, deviceName || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Credential already registered' });
    }
    next(error);
  }
});

// GET /api/credentials/:credentialId - Get credential by ID
router.get('/credentials/:credentialId', async (req, res, next) => {
  try {
    const { credentialId } = req.params;

    const result = await pool.query(
      'SELECT * FROM device_credentials WHERE credential_id = $1',
      [credentialId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/addresses/generate - Generate valid Zcash addresses
router.post('/addresses/generate', async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    const addresses = generateWalletAddresses(userId);

    res.json({
      tAddr: addresses.tAddr,
      ua: addresses.ua,
      isValid: addresses.isValid
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/wallets - Create/update wallet
router.post('/wallets', async (req, res, next) => {
  try {
    const { userId, ua, spendingKeyEnc, ivkEnc, ovkEnc } = req.body;

    if (!userId || !ua) {
      return res.status(400).json({ error: 'Missing required fields: userId, ua' });
    }

    const result = await pool.query(
      `INSERT INTO wallets (user_id, ua, spending_key_enc, ivk_enc, ovk_enc, backup_uploaded)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
       SET ua = EXCLUDED.ua,
           spending_key_enc = COALESCE(EXCLUDED.spending_key_enc, wallets.spending_key_enc),
           ivk_enc = COALESCE(EXCLUDED.ivk_enc, wallets.ivk_enc),
           ovk_enc = COALESCE(EXCLUDED.ovk_enc, wallets.ovk_enc),
           backup_uploaded = CASE WHEN EXCLUDED.spending_key_enc IS NOT NULL THEN true ELSE wallets.backup_uploaded END
       RETURNING *`,
      [
        userId,
        ua,
        spendingKeyEnc || null,
        ivkEnc || null,
        ovkEnc || null,
        spendingKeyEnc ? true : false,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/wallets/:userId - Get wallet by user ID
router.get('/wallets/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/balance/:address - Get address balance
router.get('/balance/:address', async (req, res, next) => {
  try {
    const { address } = req.params;

    // Validate address using proper checksum validation
    if (!validateTAddress(address)) {
      return res.status(400).json({ error: 'Invalid transparent address' });
    }

    const balanceInfo = await getAddressBalance(address);
    res.json(balanceInfo);
  } catch (error) {
    console.error('Error fetching balance:', error);
    next(error);
  }
});

// POST /api/wallet/export-key - Export private key for recovery
router.post('/wallet/export-key', async (req, res, next) => {
  try {
    const { userId, confirmation } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Security confirmation
    if (confirmation !== 'I_UNDERSTAND_THIS_IS_MY_PRIVATE_KEY') {
      return res.status(400).json({ 
        error: 'You must confirm you understand this exports your private key',
        requiredConfirmation: 'I_UNDERSTAND_THIS_IS_MY_PRIVATE_KEY'
      });
    }

    const keyData = exportPrivateKey(userId);
    
    res.json({
      success: true,
      ...keyData,
      warning: 'NEVER share this private key with anyone. Anyone with this key can spend your funds.'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/wallet/balance-simple/:address - Get balance using external API
router.get('/wallet/balance-simple/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    const balanceData = await getSimpleBalance(address);
    
    res.json(balanceData);
  } catch (error) {
    next(error);
  }
});

// All routes under /api
export const setupRoutes = (app) => {
  app.use('/api', router);
};

export default router;
