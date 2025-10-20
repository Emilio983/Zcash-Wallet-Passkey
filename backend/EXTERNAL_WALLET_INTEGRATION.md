# External Wallet Integration Guide

## Overview

This document describes how to integrate external Zcash wallets (like ZecWallet Lite) with the backend API for transparent address (t-addr) transactions on MAINNET.

## Architecture

```
External Wallet (ZecWallet Lite)
         ↓
    Backend API (/api/balance, /api/tx/submit)
         ↓
  zcash-bridge (REST→gRPC bridge)
         ↓
  lightwalletd (zcash.mysideoftheweb.com:9067)
         ↓
    Zcash Mainnet
```

## API Endpoints

### 1. Get Balance for Transparent Address

**Endpoint:** `GET /api/balance/:taddr`

**Description:** Fetch real-time balance and UTXOs for a mainnet transparent address.

**Request:**
```bash
curl https://zcash.socialmask.org/api/balance/t1YYnByMzdGhQv3W3rnjHMrJs6HH4Y231gy
```

**Response:**
```json
{
  "address": "t1YYnByMzdGhQv3W3rnjHMrJs6HH4Y231gy",
  "balance": 5000000,
  "utxos": [
    {
      "txid": "abcd1234...",
      "vout": 0,
      "value": 5000000,
      "height": 2680123
    }
  ]
}
```

**Validation:**
- Address must match mainnet transparent format: `/^t[13][a-zA-Z0-9]{33}$/`
- Returns 400 if invalid address format
- Returns balance in zatoshis (1 ZEC = 100,000,000 zatoshis)

**Note:** Currently using fallback mode while lightwalletd gRPC connection is being established. Returns zero balance until real connection is active.

---

### 2. Submit Signed Transaction

**Endpoint:** `POST /api/tx/submit`

**Description:** Submit a raw signed transaction to the Zcash network.

**Request:**
```bash
curl -X POST https://zcash.socialmask.org/api/tx/submit \
  -H "Content-Type: application/json" \
  -d '{
    "rawTxHex": "0400008085202f8901abcd1234...",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
      "direction": "outgoing",
      "amount_zats": 100000,
      "to_addr": "t1abc...",
      "memo": "Payment to exchange"
    }
  }'
```

**Parameters:**
- `rawTxHex` (required): Hex-encoded signed transaction
- `userId` (required): UUID of the registered user
- `metadata` (optional): Transaction metadata for logging
  - `direction`: "outgoing" | "incoming"
  - `amount_zats`: Amount in zatoshis
  - `to_addr`: Destination address
  - `memo`: Transaction description

**Response (Success):**
```json
{
  "success": true,
  "txid": "abcd1234567890abcdef...",
  "status": "pending",
  "id": 123,
  "created_at": "2025-10-20T08:00:00.000Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Transaction rejected by network"
}
```

**Validation:**
- `rawTxHex` must be valid hexadecimal: `/^[0-9a-fA-F]+$/`
- `userId` must be a valid UUID and exist in the database
- Returns 400 for validation errors
- Returns 500 for network/database errors

---

## Transaction Status Tracking

After submitting a transaction, it will appear with `status: "pending"` in the database. A background cron job checks pending transactions every 5 minutes and updates their status:

**Transaction Lifecycle:**
1. **pending** - Just submitted, waiting for confirmations
2. **confirmed** - Transaction found in blockchain with confirmations
3. **failed** - Transaction not found after 60 minutes

**Query Transaction Status:**
```bash
curl https://zcash.socialmask.org/api/tx/:txid
```

**Query User Transaction History:**
```bash
curl https://zcash.socialmask.org/api/tx/user/:userId?limit=50&offset=0
```

---

## E2E Flow with ZecWallet Lite

### Step 1: Fund Transparent Address
1. User creates account via frontend (WebAuthn)
2. Frontend displays t-addr in ReceiveCard component
3. User copies t-addr and sends ZEC from exchange (e.g., Binance)
4. Wait for confirmations on blockchain

### Step 2: Check Balance
```bash
# Frontend calls this automatically when user clicks "Sync"
GET /api/balance/t1abc...

# Response shows real balance from lightwalletd
{
  "address": "t1abc...",
  "balance": 5000000,
  "utxos": [...]
}
```

### Step 3: Create Transaction with ZecWallet Lite
```bash
# Using ZecWallet Lite CLI or GUI:
zecwallet-cli send t1destination 0.05

# ZecWallet Lite returns:
{
  "txid": "abcd1234...",
  "raw": "0400008085202f89..."
}
```

### Step 4: Submit to Backend
```bash
POST /api/tx/submit
{
  "rawTxHex": "0400008085202f89...",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "direction": "outgoing",
    "amount_zats": 5000000,
    "to_addr": "t1destination..."
  }
}

# Response:
{
  "success": true,
  "txid": "abcd1234...",
  "status": "pending"
}
```

### Step 5: Monitor Status
```bash
# Check every 5 minutes (or wait for cron job)
GET /api/tx/abcd1234...

# Eventually returns:
{
  "id": 123,
  "txid": "abcd1234...",
  "status": "confirmed",
  "block_height": 2680234,
  "confirmations": 3,
  "updated_at": "2025-10-20T08:05:00.000Z"
}
```

---

## Database Schema

**tx_log table:**
```sql
CREATE TABLE tx_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  txid TEXT UNIQUE NOT NULL,
  direction TEXT,
  amount_zats BIGINT,
  to_addr TEXT,
  memo TEXT,
  status TEXT DEFAULT 'pending',
  block_height INTEGER,
  confirmations INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security Considerations

1. **Rate Limiting:** Transaction submission is rate-limited via `txLimiter` middleware
2. **User Registration:** Only registered users can submit transactions
3. **Hex Validation:** Raw transaction hex is validated before submission
4. **CORS:** API restricted to `https://zcash.socialmask.org` origin
5. **HTTPS:** All API calls must use HTTPS in production

---

## Current Limitations

1. **Fallback Mode:** Bridge currently operates in fallback mode because lightwalletd requires `--ping-very-insecure` flag. Balance queries return zero until real gRPC connection is established.

2. **No Built-in Signer:** Backend does not sign transactions. External wallets (ZecWallet Lite, Zingo CLI) must be used for signing.

3. **Transparent Only:** Currently only supports transparent addresses (t-addr). Shielded transactions require WASM implementation.

---

## Services Status

Check that all services are running:

```bash
# Backend API
curl http://localhost:8080/api/blocks/head

# Bridge
curl http://localhost:3000/blocks/head

# Nginx
curl https://zcash.socialmask.org/api/blocks/head
```

View service logs:
```bash
# Backend
journalctl -u zcash-backend -f

# Bridge
journalctl -u zcash-bridge -f

# Nginx
tail -f /var/log/nginx/error.log
```

---

## Support

For issues, check:
1. Backend logs: `/var/www/zcash.socialmask.org/backend` npm logs
2. Bridge logs: `systemctl status zcash-bridge`
3. Nginx logs: `/var/log/nginx/error.log`
4. Database: `psql -U wallet_user -d wallet_db -c "SELECT * FROM tx_log ORDER BY created_at DESC LIMIT 10;"`

---

**Last Updated:** 2025-10-20
**Network:** Mainnet
**Lightwalletd:** zcash.mysideoftheweb.com:9067
