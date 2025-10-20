# Zcash Wallet Passkey

So basically this is a Zcash wallet that works with passkeys instead of the usual seed phrases. Like you know how normally you gotta write down 12 or 24 words and keep them super safe? Well this just uses your fingerprint or face ID or whatever passkey thing your device has.

## What it does

The wallet lets you send and receive Zcash (ZEC) but instead of dealing with seed phrases, it authenticates you through WebAuthn passkeys. Pretty much works like when you unlock your phone or login to some modern websites with your fingerprint. The keys are stored securely on your device and you never have to worry about writing stuff down on paper.

It's got the basic stuff you need:
- Create a wallet with just your passkey (no seed phrase needed)
- Check your balance
- **Send ZEC to other addresses (FULLY WORKING!)**
- Receive ZEC with a QR code
- See your transaction history
- Export your private key if you need to import into another wallet

## How it works

When you register, it creates a passkey on your device using WebAuthn. That passkey is used to derive your Zcash keys deterministically. The frontend is React-based but the backend handles the actual transaction building and broadcasting.

**NEW: Real transaction support!** The wallet now builds, signs, and broadcasts REAL Zcash transactions using:
- `bitcoinjs-lib` for transaction construction and signing
- `ecpair` and `tiny-secp256k1` for cryptographic operations
- External APIs (Blockchair) for fetching UTXOs and broadcasting transactions

The frontend is React with Tailwind CSS (keeping it simple with black and white theme). Backend is Node.js/Express that uses external APIs to interact with the Zcash blockchain. There's also a PostgreSQL database that keeps track of user credentials and wallet data.

## Quick note about performance

Just fyi, this is running on a VPS with limited resources so it might not be super fast all the time. The external API calls can take a few seconds. It's more of a functional wallet now than just a proof of concept, but it's still in development.

## Demo

Check it out at: https://zcash.socialmask.org

## Tech stack

- Frontend: React + Vite + TailwindCSS
- Backend: Node.js + Express
- Database: PostgreSQL
- Transaction Signing: bitcoinjs-lib + ecpair + tiny-secp256k1
- Blockchain APIs: Blockchair API for UTXOs and broadcasting
- Auth: WebAuthn/Passkeys

## Getting started

If you wanna run this locally or deploy it yourself, check out the [QUICKSTART.md](QUICKSTART.md) and [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) files. There's also more detailed docs in the `docs/` folder.

The basic setup is:
```bash
cd /var/www/zcash.socialmask.org
./scripts/setup.sh
```

But yeah you'll need Docker and a decent VPS if you wanna run it.

## How the passkey thing works

Instead of traditional key management where you have to backup seeds and all that, this uses your device's secure enclave (like the Secure Enclave on iPhones or TPM on Windows). When you create a wallet:

1. Your device generates a passkey pair (public/private)
2. The private key never leaves your device
3. We use the passkey to derive deterministic Zcash keys
4. Every time you want to sign a transaction, you authenticate with your passkey
5. No seed phrases to lose or get stolen

The downside is if you lose your device and didn't backup your passkey through your OS (like iCloud Keychain or Google Password Manager), you lose access. But most people these days have their passkeys synced across devices anyway.

**Alternative: Export Private Key**  
You can also export your private key in WIF format from the wallet and import it into other Zcash wallets like Ywallet or Zecwallet. This gives you a backup option.

## How sending money works

When you send ZEC from the wallet:
1. Frontend collects the recipient address and amount
2. Backend fetches your UTXOs from Blockchair API
3. Backend builds a proper Zcash transaction using bitcoinjs-lib
4. Transaction is signed with your deterministic private key
5. Signed transaction is broadcast to the Zcash network via Blockchair
6. You get back a transaction ID (txid) that you can track on block explorers

It handles:
- UTXO selection
- Fee calculation (10 sats/byte)
- Change outputs
- Support for t1, t3, and tex1 addresses

## Project status

This is now WORKING for sending and receiving transparent ZEC! Main features:
- ✅ Receive ZEC to your address
- ✅ Send ZEC to any address (including Binance)
- ✅ Check balance in real-time
- ✅ View transaction history
- ✅ Export private key for recovery
- ⚠️ No shielded address support yet (only transparent t1... addresses)
- ⚠️ Performance depends on external APIs and VPS resources

It's good enough to actually use for sending and receiving ZEC, but I wouldn't recommend putting huge amounts in it since it's still in active development.

## Security Notes

- Your spending key is derived deterministically from your userId
- Keys are generated server-side (for this implementation)
- You can export your private key to maintain full custody
- All transactions are transparent (not shielded) for now
- Use the export key feature to backup to another wallet for extra safety

## License

MIT or whatever, feel free to use it however you want.

