# Zcash Wallet Passkey

So basically this is a Zcash wallet that works with passkeys instead of the usual seed phrases. Like you know how normally you gotta write down 12 or 24 words and keep them super safe? Well this just uses your fingerprint or face ID or whatever passkey thing your device has.

## What it does

The wallet lets you send and receive Zcash (ZEC) but instead of dealing with seed phrases, it authenticates you through WebAuthn passkeys. Pretty much works like when you unlock your phone or login to some modern websites with your fingerprint. The keys are stored securely on your device and you never have to worry about writing stuff down on paper.

It's got the basic stuff you need:
- Create a wallet with just your passkey (no seed phrase needed)
- Check your balance
- Send ZEC to other addresses
- Receive ZEC with a QR code
- See your transaction history

## How it works

When you register, it creates a passkey on your device using WebAuthn. That passkey is used to derive your Zcash keys through some WASM magic with the librustzcash library. The whole thing runs in the browser but uses a backend to sync with the Zcash network since doing everything client-side would be pretty heavy.

The frontend is React with Tailwind CSS (keeping it simple with black and white theme). Backend is Node.js/Express that talks to a Zcash node (zebrad) through lightwalletd. There's also a PostgreSQL database that keeps track of user credentials and wallet data.

## Quick note about performance

Just fyi, this is running on a VPS with limited resources so it might not be super fast all the time. The Zcash node sync can take a while and if multiple people are using it at once it could slow down a bit. It's more of a proof of concept than a production-ready thing, but it works.

## Demo

Check it out at: https://zcash.socialmask.org

## Tech stack

- Frontend: React + Vite + TailwindCSS
- Backend: Node.js + Express
- Database: PostgreSQL
- WASM: Rust + librustzcash
- Zcash: zebrad + lightwalletd
- Auth: WebAuthn/Passkeys

## Getting started

If you wanna run this locally or deploy it yourself, check out the [QUICKSTART.md](QUICKSTART.md) and [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) files. There's also more detailed docs in the `docs/` folder.

The basic setup is:
```bash
cd /var/www/zcash.socialmask.org
./scripts/setup.sh
```

But yeah you'll need Docker and a decent VPS if you wanna run the full Zcash node.

## How the passkey thing works

Instead of traditional key management where you have to backup seeds and all that, this uses your device's secure enclave (like the Secure Enclave on iPhones or TPM on Windows). When you create a wallet:

1. Your device generates a passkey pair (public/private)
2. The private key never leaves your device
3. We use the passkey to derive deterministic Zcash keys
4. Every time you want to sign a transaction, you authenticate with your passkey
5. No seed phrases to lose or get stolen

The downside is if you lose your device and didn't backup your passkey through your OS (like iCloud Keychain or Google Password Manager), you lose access. But most people these days have their passkeys synced across devices anyway.

## Project status

This is working but definitely has some limitations. The main ones being:
- Performance depends on the VPS resources (limited right now)
- Zcash node sync can take time
- No support for shielded addresses yet (only transparent for now)
- Recovery options are limited to whatever your passkey provider offers

It's good enough to show how passkey-based wallets can work with Zcash but I wouldn't recommend putting your life savings in it just yet lol.

## License

MIT or whatever, feel free to use it however you want.
