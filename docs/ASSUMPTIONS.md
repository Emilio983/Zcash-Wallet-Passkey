# Assumptions & Design Decisions

## Architecture Decisions

### 1. Node Selection: Zebrad over Zcashd
**Decision**: Use `zebrad` as the full node instead of `zcashd`
**Rationale**:
- Zebrad is the next-generation Zcash node written in Rust
- Better performance and memory efficiency
- Active development and future-proof
- Native Orchard support

### 2. Network: Testnet
**Decision**: All implementation targets Zcash testnet
**Rationale**:
- Safe testing environment
- No real funds at risk
- Can request testnet coins from faucets

### 3. Encryption: Argon2id + AES-GCM
**Decision**: Use Argon2id for key derivation from WebAuthn credential, AES-256-GCM for spending key encryption
**Rationale**:
- Argon2id is memory-hard, resistant to GPU/ASIC attacks
- WebAuthn credential ID + user gesture → deterministic key derivation
- AES-GCM provides authenticated encryption
- All operations happen client-side

### 4. WASM Build: librustzcash bindings
**Decision**: Create minimal Rust WASM module wrapping librustzcash
**Rationale**:
- librustzcash is the canonical Zcash library
- Provides all necessary primitives (UA derivation, transaction building, ZK proofs)
- WASM allows running in browser with near-native performance
- WebWorker prevents UI blocking during expensive operations

### 5. Backup Strategy: Encrypted Blob Upload
**Decision**: Store encrypted spending key blob on backend, keyed by user_id
**Rationale**:
- Backend never sees plaintext keys
- Enables device recovery with new passkey
- User controls when/if to upload backup
- Can be extended to IPFS/decentralized storage later

### 6. Transaction Relay: Backend as Proxy
**Decision**: Backend relays transactions to lightwalletd, doesn't validate
**Rationale**:
- Keeps backend stateless and simple
- lightwalletd handles validation and broadcast
- Backend only logs txid + metadata for user history

### 7. Sync Strategy: Compact Blocks via lightwalletd
**Decision**: Frontend syncs via lightwalletd gRPC-web
**Rationale**:
- Compact blocks minimize bandwidth
- Trial decryption in WASM WebWorker
- Only download full blocks for matched notes
- Standard approach used by existing Zcash wallets

### 8. UI Framework: React + Vite
**Decision**: Modern React with Vite bundler, TailwindCSS for styling
**Rationale**:
- Fast development iteration with Vite HMR
- TailwindCSS utility-first approach enables rapid styling
- Easy to enforce black/white design system
- Large ecosystem and tooling support

### 9. Backend Framework: Express.js
**Decision**: Minimal Express.js API with PostgreSQL
**Rationale**:
- Simple, well-understood framework
- Easy to add routes/middleware as needed
- Good PostgreSQL library support (pg)
- Lightweight for MVP scope

### 10. Database: PostgreSQL
**Decision**: PostgreSQL for all persistence
**Rationale**:
- ACID guarantees for transaction log
- UUID support for user/credential IDs
- JSON/JSONB for flexible metadata
- Can handle encrypted blobs as bytea

## Security Assumptions

### 1. Browser Security Model
**Assumption**: User's browser and OS are not compromised
**Impact**: All client-side cryptography depends on trusted execution environment
**Mitigation**: Recommend hardware-backed passkeys (TPM, Secure Enclave)

### 2. WebAuthn Credential Protection
**Assumption**: Passkey credentials are securely stored by OS/authenticator
**Impact**: Credential compromise = ability to decrypt spending key
**Mitigation**:
- Require user presence for all WebAuthn operations
- Support multiple passkeys per user
- Notify user on new device registration

### 3. Backend is Honest-but-Curious
**Assumption**: Backend follows protocol but may log/observe data
**Impact**: Backend sees: UAs, tx amounts, destinations, timing
**Mitigation**:
- End-to-end encryption for spending keys
- Future: Tor/VPN recommendations for IP privacy
- Future: Decentralized backend alternatives

### 4. CSP and SRI
**Assumption**: Proper CSP headers prevent XSS, SRI ensures WASM integrity
**Impact**: Prevents malicious code injection
**Mitigation**:
- Strict CSP with nonce-based script execution
- SRI hashes for all external resources
- Regular security audits

## MVP Scope Limitations

### What's Included
1. **Core Wallet Functions**: Generate UA, receive ZEC, send ZEC (Orchard pool)
2. **Seedless Auth**: WebAuthn/Passkey registration and authentication
3. **Non-Custodial**: All keys derived and managed client-side
4. **Basic Sync**: Compact block sync and note detection
5. **Transaction History**: Local tx log with status tracking
6. **Recovery**: Encrypted backup to backend for device recovery

### What's Excluded (Future Work)
1. **Multi-Pool Support**: Only Orchard in MVP (no Sapling/Transparent pools)
2. **Hardware Wallets**: No Ledger/Trezor integration
3. **Advanced Privacy**: No Tor, no decoy traffic, no timing obfuscation
4. **Fee Estimation**: Use fixed fee for MVP
5. **Address Book**: No contact management
6. **Multi-Send**: Single recipient per transaction
7. **Shielding/Deshielding**: No auto-shielding of transparent received funds
8. **Mobile Apps**: Web-only (PWA possible but not optimized)
9. **Localization**: English only
10. **Governance**: No integration with Zcash governance (ZIP voting, etc.)

## Performance Assumptions

### WASM Performance
**Assumption**: Orchard proof generation takes 5-30 seconds in WASM
**Impact**: Users must wait during transaction creation
**Mitigation**:
- Show progress indicator
- Run in WebWorker to prevent UI freeze
- Cache proving keys in IndexedDB (large, 50MB+)

### Sync Performance
**Assumption**: Initial sync may take minutes depending on wallet age
**Impact**: First-time user experience has loading time
**Mitigation**:
- Show sync progress (blocks/second, ETA)
- Allow background sync
- Store sync state in IndexedDB

### Backend Scalability
**Assumption**: MVP handles <100 concurrent users
**Impact**: No horizontal scaling, single postgres instance
**Mitigation**:
- Basic rate limiting (10 req/min per IP)
- Connection pooling
- Document scaling requirements for production

## Operational Assumptions

### Deployment Model
**Assumption**: Docker Compose for all services, single VPS deployment
**Impact**: Not production-grade HA/DR
**Mitigation**:
- Document single points of failure
- Provide backup/restore scripts for postgres
- Include monitoring/alerting setup

### Node Sync
**Assumption**: Zebrad takes 24-48 hours to sync testnet from genesis
**Impact**: Cannot test immediately after deployment
**Mitigation**:
- Provide snapshot/bootstrap instructions
- Document expected sync times
- Include health check scripts

### Maintenance
**Assumption**: Requires periodic maintenance (log rotation, db cleanup)
**Impact**: Not fully hands-off operation
**Mitigation**:
- Include maintenance scripts
- Document operational runbooks
- Set up basic monitoring

## Regulatory & Compliance
**Assumption**: This is an experimental MVP, not a regulated financial service
**Impact**: No KYC/AML, no terms of service, no legal entity
**Mitigation**:
- Clear disclaimer on UI
- Testnet only for MVP
- Document regulatory requirements for mainnet launch

## Future Roadmap Priorities
1. **Mainnet Support**: Careful security audit before mainnet
2. **Multi-Pool**: Add Sapling and Transparent pool support
3. **Mobile**: Native iOS/Android apps with secure enclave
4. **Hardware Wallet**: Ledger integration for max security
5. **Decentralization**: IPFS backup, peer-to-peer sync options
6. **Privacy Enhancements**: Tor integration, decoy traffic
7. **UX Polish**: Fee estimation, address book, multi-send
8. **Accessibility**: Screen reader support, keyboard navigation
9. **Localization**: Spanish, Mandarin, etc.
10. **Governance**: ZIP proposal voting, community features
