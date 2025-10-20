# Zcash Seedless Wallet - MVP Documentation

## Overview

A **seedless, non-custodial Zcash wallet** using **WebAuthn/Passkeys** for authentication and **Orchard** for shielded transactions.

**Key Features:**
- 🔐 No seed phrases - secured by device biometrics (Face ID, Touch ID, Windows Hello)
- 🛡️ Non-custodial - keys never leave your device in plaintext
- 🎭 Private by default - Orchard shielded pool
- 🌐 Web-based - works in any modern browser
- 🔄 Easy recovery - encrypted backup with new passkey on different device

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for development)
- Rust & wasm-pack (for WASM build)
- Modern browser with WebAuthn support

### 1. Clone and Setup

```bash
cd /var/www/zcash.socialmask.org
cp infra/.env.example infra/.env
# Edit .env with your configuration
```

### 2. Start Infrastructure

```bash
cd infra
docker-compose up -d
```

This starts:
- **zebrad** (Zcash node) on port 18232
- **lightwalletd** (lightweight backend) on ports 9067/9068
- **postgres** (database) on port 5432
- **backend** (API) on port 8080

### 3. Wait for Node Sync

⚠️ **Important:** Zebrad needs to sync with testnet (24-48 hours from genesis).

Check sync status:
```bash
docker logs -f zcash-zebrad
```

### 4. Build WASM Module (Optional - MVP uses stubs)

```bash
cd wasm
./build.sh
```

This compiles the Rust WASM module and outputs to `frontend/public/wasm/`.

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### 6. Configure nginx (Production)

For production deployment on `zcash.socialmask.org`:

```bash
# See "Deployment" section below
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React UI (Vite)                                     │  │
│  │  - WebAuthn/Passkey authentication                   │  │
│  │  - IndexedDB (encrypted keys, tx cache)              │  │
│  └──────────────┬────────────────────────────────┬──────┘  │
│                 │                                 │          │
│        ┌────────▼────────┐              ┌────────▼────────┐ │
│        │  WebWorker      │              │  WebCrypto      │ │
│        │  (WASM)         │              │  (Argon2+AES)   │ │
│        │  - Key gen      │              │  - Encryption   │ │
│        │  - Tx build     │              │  - Key derive   │ │
│        │  - ZK proofs    │              └─────────────────┘ │
│        └─────────────────┘                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 │
    ┌────────────▼───────────────┐
    │  Backend (Node/Express)    │
    │  - Tx relay                │
    │  - Encrypted backup storage│
    │  - No keys/PII             │
    └────────┬──────────┬────────┘
             │          │
             │          │
    ┌────────▼────┐   ┌▼──────────┐
    │  Postgres   │   │lightwalletd│
    │  - User IDs │   │  (gRPC)    │
    │  - Tx log   │   └──────┬─────┘
    │  - Backups  │          │
    └─────────────┘   ┌──────▼─────┐
                      │   zebrad   │
                      │  (Zcash    │
                      │   node)    │
                      └────────────┘
```

## User Flows

### First-Time User (Registration)

1. User clicks "Create New Wallet"
2. Browser prompts for passkey creation (Face ID, Touch ID, etc.)
3. Frontend generates spending key (WASM)
4. Key encrypted with derived password from passkey
5. Encrypted key stored in IndexedDB
6. Unified Address (UA) derived from key
7. UA displayed to user
8. Optional: Upload encrypted backup to backend

### Returning User (Login)

1. User clicks "Login with Passkey"
2. Browser prompts for passkey authentication
3. Frontend retrieves encrypted key from IndexedDB
4. Key decrypted with passkey-derived password
5. Wallet ready to use

### Receiving ZEC

1. User navigates to "Receive" tab
2. UA displayed with QR code
3. User shares UA with sender
4. Frontend syncs with lightwalletd (compact blocks)
5. WASM trial-decrypts notes with IVK
6. Balance updated

### Sending ZEC

1. User navigates to "Send" tab
2. Enters recipient address, amount, memo
3. Frontend validates inputs
4. WASM builds transaction in WebWorker
   - Selects notes
   - Generates Orchard proof (slow, 5-30s)
   - Signs with spending key
5. Raw tx hex submitted to backend
6. Backend relays to lightwalletd → zebrad
7. Transaction broadcasted to network
8. Status tracked in tx_log table

### Device Recovery

1. User on new device clicks "Login with Passkey"
2. Creates new passkey on new device
3. Downloads encrypted backup from backend
4. Decrypts with new passkey
5. Wallet restored

## API Endpoints

### Backend (Port 8080)

#### Health Check
```
GET /health
Response: { status: "healthy", timestamp: "...", database: "connected" }
```

#### Blockchain Info
```
GET /api/blocks/head
Response: { height: 2500000, hash: "0x...", timestamp: 1234567890 }
```

#### Submit Transaction
```
POST /api/tx/submit
Body: {
  userId: "uuid",
  rawTxHex: "hex-string",
  metadata: {
    direction: "outgoing",
    amount_zats: 100000,
    to_addr: "u1...",
    memo: "optional"
  }
}
Response: { success: true, txid: "...", status: "pending" }
```

#### Get Transaction
```
GET /api/tx/:txid
Response: { txid: "...", status: "confirmed", amount_zats: 100000, ... }
```

#### User Transaction History
```
GET /api/tx/user/:userId?limit=50&offset=0
Response: { transactions: [...], total: 10 }
```

#### Create User
```
POST /api/users
Response: { id: "uuid", created_at: "..." }
```

#### Register Credential
```
POST /api/credentials
Body: {
  userId: "uuid",
  credentialId: "base64",
  publicKey: "base64",
  deviceName: "Chrome on Mac"
}
Response: { id: "uuid", created_at: "..." }
```

#### Get Credential
```
GET /api/credentials/:credentialId
Response: { user_id: "uuid", credential_id: "...", public_key: "...", ... }
```

#### Create/Update Wallet
```
POST /api/wallets
Body: {
  userId: "uuid",
  ua: "u1...",
  spendingKeyEnc: "base64-encrypted-blob", // optional
  ivkEnc: "base64", // optional
  ovkEnc: "base64"  // optional
}
Response: { user_id: "uuid", ua: "...", backup_uploaded: true, ... }
```

#### Get Wallet
```
GET /api/wallets/:userId
Response: { user_id: "uuid", ua: "...", backup_uploaded: true, ... }
```

## Environment Variables

### Backend (.env in infra/)

```bash
# Network
NETWORK=testnet

# Database
POSTGRES_DB=wallet
POSTGRES_USER=wallet
POSTGRES_PASSWORD=change-me-in-production

# Backend
NODE_ENV=production
BACKEND_PORT=8080
CORS_ORIGIN=https://zcash.socialmask.org

# Security
CSP_ENFORCE=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

# Services
ZCASHD_HOST=zebrad
LIGHTWALLETD_HOST=lightwalletd
```

### Frontend (.env in frontend/)

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_LIGHTWALLETD_URL=http://localhost:9068
VITE_NETWORK=testnet
```

## Database Schema

See `database/migrations/001_init_schema.sql` for full schema.

**Tables:**
- `users` - User accounts (no PII)
- `device_credentials` - WebAuthn credentials
- `wallets` - Unified addresses and encrypted key backups
- `tx_log` - Transaction history
- `sync_state` - Blockchain sync progress

## Security Considerations

### What the Backend Can See
- User IDs (random UUIDs)
- Unified Addresses
- Transaction amounts and destinations
- Transaction timing
- IP addresses (in logs)

### What the Backend Cannot See
- Spending keys (encrypted, server never decrypts)
- Passkey credentials (stored by OS/browser)
- Transaction memos (encrypted in Orchard)
- Which notes belong to which transactions

### Threat Model

**Assumptions:**
- User's device is not compromised
- Browser and OS implement WebAuthn securely
- TLS prevents MITM attacks
- Backend is "honest but curious" (follows protocol but may log data)

**Mitigations:**
- End-to-end encryption for keys
- CSP and SRI for code integrity
- Rate limiting to prevent abuse
- No PII storage

**Known Limitations (MVP):**
- No Tor/VPN integration (IP privacy)
- Backend can correlate users by timing/amounts
- Single point of failure (centralized backend)
- Testnet only (not production ready)

## Testing

### Backend Unit Tests

```bash
cd backend
npm test
```

Tests cover:
- API endpoint validation
- Database operations
- Error handling

### Frontend Unit Tests

```bash
cd frontend
npm test
```

### E2E Tests

```bash
cd frontend
npm run e2e
```

**Note:** WebAuthn E2E tests require virtual authenticator setup. Current tests are structural stubs.

## Deployment

### Production Deployment (nginx + Docker)

1. **Setup domain and SSL:**
```bash
# Point zcash.socialmask.org to server IP
# Obtain SSL cert (Let's Encrypt)
```

2. **Create nginx config:**
```nginx
server {
    listen 443 ssl http2;
    server_name zcash.socialmask.org;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        root /var/www/zcash.socialmask.org/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

3. **Build and deploy:**
```bash
# Build frontend
cd frontend
npm run build

# Start infrastructure
cd ../infra
docker-compose up -d

# Reload nginx
sudo nginx -t && sudo nginx -s reload
```

4. **Monitor:**
```bash
# Check logs
docker logs -f zcash-wallet-backend
docker logs -f zcash-zebrad
docker logs -f zcash-lightwalletd

# Database backups
pg_dump -U wallet wallet > backup.sql
```

## Troubleshooting

### Zebrad not syncing
```bash
# Check logs
docker logs -f zcash-zebrad

# Verify network connectivity
docker exec zcash-zebrad curl -I https://testnet.z.cash

# Restart if stuck
docker-compose restart zebrad
```

### Lightwalletd connection failed
```bash
# Check if zebrad is ready
docker exec zcash-zebrad curl http://localhost:18232

# Check lightwalletd logs
docker logs -f zcash-lightwalletd

# Verify gRPC port
curl http://localhost:9068
```

### Backend not connecting to database
```bash
# Check postgres status
docker exec zcash-wallet-db psql -U wallet -c "SELECT 1"

# Check backend logs
docker logs -f zcash-wallet-backend

# Verify DATABASE_URL in backend .env
```

### Frontend can't reach backend
```bash
# Check CORS settings in backend
# Verify VITE_API_BASE_URL in frontend .env
# Check browser console for errors
```

### WebAuthn not working
```bash
# Verify HTTPS (required for WebAuthn)
# Check browser compatibility
# Try different authenticator (platform vs roaming)
```

### WASM module not loading
```bash
# Rebuild WASM
cd wasm && ./build.sh

# Check frontend/public/wasm/ exists
# Verify SRI hash in frontend (if using)
# Check browser console for CORS/MIME errors
```

## Performance Optimization

### WASM Proof Generation
- Orchard proofs take 5-30 seconds in WASM
- Use WebWorker to avoid UI blocking
- Cache proving parameters in IndexedDB (~50MB)
- Show progress indicator to user

### Sync Performance
- Initial sync can take minutes
- Use checkpoint system (future)
- Batch compact block fetches
- Run sync in background

### Backend Scaling
- Add Redis for caching
- Horizontal scaling with load balancer
- Read replicas for postgres
- CDN for frontend assets

## Roadmap: MVP → Beta → Production

### Beta Checklist
- [ ] Complete WASM implementation (real librustzcash)
- [ ] Implement actual lightwalletd gRPC calls
- [ ] Add multi-pool support (Transparent, Sapling)
- [ ] Comprehensive E2E tests with virtual authenticator
- [ ] Security audit (professional)
- [ ] Performance testing (1000+ users)
- [ ] Mobile PWA optimization
- [ ] Backup/restore UX improvements
- [ ] Fee estimation
- [ ] Address validation improvements

### Production Checklist
- [ ] Mainnet support (separate deployment)
- [ ] Hardware wallet integration
- [ ] Tor/I2P integration
- [ ] Decentralized backup (IPFS)
- [ ] Multi-language support
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Legal review (ToS, Privacy Policy)
- [ ] Bug bounty program
- [ ] 24/7 monitoring and alerting
- [ ] Disaster recovery plan

## Support

- **Issues:** https://github.com/[org]/zcash-wallet/issues
- **Docs:** https://zcash.socialmask.org/docs
- **Zcash Community:** https://forum.zcashcommunity.com

## License

MIT License - See LICENSE file

## Disclaimer

⚠️ **Experimental Software - Testnet Only**

This is an MVP implementation for testing and development purposes only. Do NOT use with real funds on mainnet. No warranties provided. Use at your own risk.
