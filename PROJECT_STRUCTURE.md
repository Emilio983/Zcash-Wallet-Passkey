# Zcash Seedless Wallet - Project Structure

```
/var/www/zcash.socialmask.org/
│
├── 📁 infra/                           # Infrastructure configuration
│   ├── docker-compose.yml              # Docker services (zebrad, lightwalletd, postgres, backend)
│   ├── zebrad.toml                     # Zebrad node configuration
│   └── .env.example                    # Environment variables template
│
├── 📁 database/                        # Database schemas and migrations
│   └── migrations/
│       └── 001_init_schema.sql         # Initial database schema
│
├── 📁 backend/                         # Node.js/Express API server
│   ├── package.json                    # Dependencies and scripts
│   ├── Dockerfile                      # Backend container
│   ├── openapi.yaml                    # API specification
│   └── src/
│       ├── index.js                    # Main application entry
│       ├── models/
│       │   └── db.js                   # Database connection pool
│       ├── routes/
│       │   └── index.js                # API routes (/blocks, /tx, /users, /credentials, /wallets)
│       ├── middleware/
│       │   └── security.js             # Rate limiting, logging, security headers
│       ├── services/
│       │   └── cron.js                 # Background jobs (tx status updates)
│       └── tests/
│           └── api.test.js             # Unit and integration tests
│
├── 📁 wasm/                            # Rust WASM module for Zcash operations
│   ├── Cargo.toml                      # Rust dependencies (librustzcash)
│   ├── build.sh                        # WASM build script
│   └── src/
│       └── lib.rs                      # WASM functions (key gen, UA derivation, tx building)
│
├── 📁 frontend/                        # React frontend application
│   ├── package.json                    # Dependencies and scripts
│   ├── vite.config.js                  # Vite bundler configuration
│   ├── tailwind.config.js              # TailwindCSS (black/white theme)
│   ├── postcss.config.js               # PostCSS configuration
│   ├── playwright.config.js            # E2E test configuration
│   ├── index.html                      # HTML entry point
│   ├── public/                         # Static assets
│   │   └── wasm/                       # WASM module output (after build)
│   ├── src/
│   │   ├── main.jsx                    # React entry point
│   │   ├── App.jsx                     # Main app component
│   │   ├── styles/
│   │   │   └── index.css               # Global styles (TailwindCSS)
│   │   ├── components/                 # React components
│   │   │   ├── LoginScreen.jsx         # WebAuthn login/register
│   │   │   ├── WalletDashboard.jsx     # Main wallet UI
│   │   │   ├── BalanceCard.jsx         # Balance display
│   │   │   ├── ReceiveCard.jsx         # Receive ZEC (UA + QR)
│   │   │   ├── SendCard.jsx            # Send ZEC form
│   │   │   └── TransactionList.jsx     # Transaction history
│   │   ├── hooks/                      # React hooks
│   │   │   ├── useAuth.jsx             # Authentication state
│   │   │   └── useWallet.jsx           # Wallet state and sync
│   │   ├── services/                   # Business logic
│   │   │   ├── webauthn.js             # WebAuthn/Passkey integration
│   │   │   └── indexeddb.js            # Local storage (IndexedDB)
│   │   ├── utils/                      # Utilities
│   │   │   ├── config.js               # Configuration constants
│   │   │   └── encoding.js             # Base64/hex conversions
│   │   └── workers/                    # Web Workers
│   │       └── wallet.worker.js        # WASM operations (non-blocking)
│   └── tests/
│       └── e2e/
│           └── wallet-flow.spec.js     # E2E tests (Playwright)
│
├── 📁 docs/                            # Documentation
│   ├── README.md                       # Main documentation (setup, architecture, API, deployment)
│   ├── ASSUMPTIONS.md                  # Technical decisions and assumptions
│   └── MVP_SUMMARY_AND_GAP_REPORT.md  # Implementation summary and gap analysis
│
├── 📁 scripts/                         # Utility scripts
│   ├── setup.sh                        # Automated setup script
│   ├── setup-ssl.sh                    # SSL certificate setup (Let's Encrypt)
│   ├── nginx-config.conf               # Production nginx config (with SSL)
│   └── nginx-dev.conf                  # Development nginx config (no SSL)
│
└── PROJECT_STRUCTURE.md                # This file

```

## Key Entry Points

### 🚀 Getting Started
1. **Setup:** `./scripts/setup.sh`
2. **Documentation:** `docs/README.md`
3. **Gap Report:** `docs/MVP_SUMMARY_AND_GAP_REPORT.md`

### 🔧 Development
- **Backend dev:** `cd backend && npm run dev`
- **Frontend dev:** `cd frontend && npm run dev`
- **WASM build:** `cd wasm && ./build.sh`

### 🧪 Testing
- **Backend tests:** `cd backend && npm test`
- **E2E tests:** `cd frontend && npm run e2e`

### 📦 Deployment
- **Infrastructure:** `cd infra && docker-compose up -d`
- **SSL setup:** `./scripts/setup-ssl.sh`
- **Nginx config:** `/etc/nginx/sites-available/zcash.socialmask.org`

## File Count by Category

| Category | Files | Lines of Code |
|----------|-------|---------------|
| Infrastructure | 3 | ~150 |
| Database | 1 | ~120 |
| Backend | 8 | ~800 |
| WASM | 3 | ~200 |
| Frontend | 20 | ~1500 |
| Tests | 3 | ~250 |
| Documentation | 4 | ~1200 |
| Scripts | 4 | ~200 |
| **TOTAL** | **46** | **~4420** |

## Technology Stack

**Backend:**
- Node.js 20+
- Express.js
- PostgreSQL 15
- Docker & Docker Compose

**Frontend:**
- React 18
- Vite
- TailwindCSS
- IndexedDB (idb)
- WebAuthn API
- QRCode generation

**Blockchain:**
- Zebrad (Zcash node)
- Lightwalletd (gRPC backend)

**WASM:**
- Rust
- wasm-bindgen
- librustzcash (stub in MVP)

**Testing:**
- Node.js built-in test runner
- Playwright (E2E)

**Deployment:**
- nginx
- Let's Encrypt (SSL)
- systemd

## Critical Paths

**For functional testnet wallet:**
1. Complete WASM implementation → `/wasm/src/lib.rs`
2. Backend lightwalletd integration → `/backend/src/services/lightwalletd.js` (create)
3. Frontend sync implementation → `/frontend/src/hooks/useWallet.jsx`

**For production deployment:**
1. SSL setup → `./scripts/setup-ssl.sh`
2. Security audit → TBD
3. Monitoring → TBD

## Notes

- ✅ **Complete** = Fully implemented
- ⚠️ **Stub** = Structure in place, needs real implementation
- ❌ **Missing** = Not implemented (out of MVP scope)

See `docs/MVP_SUMMARY_AND_GAP_REPORT.md` for detailed gap analysis.
