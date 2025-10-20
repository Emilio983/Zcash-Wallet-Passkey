# Zcash Seedless Wallet - Quickstart Guide

**Status:** ✅ MVP Completo (con stubs funcionales)
**Ubicación:** `/var/www/zcash.socialmask.org`
**URL:** `http://zcash.socialmask.org` (HTTPS pending SSL setup)

---

## 🎯 ¿Qué es esto?

Un **wallet Zcash seedless y non-custodial** que usa:
- **Passkeys** (Face ID/Touch ID) en vez de seed phrases
- **Orchard** para transacciones privadas
- **WebAuthn** para autenticación sin contraseñas
- **WASM** para operaciones criptográficas en el navegador

**No custodial:** El servidor nunca ve tus llaves privadas.

---

## ⚡ Setup en 5 Minutos

### Opción 1: Setup Automático (Recomendado)

```bash
cd /var/www/zcash.socialmask.org
./scripts/setup.sh
```

Esto:
1. ✅ Verifica dependencias (Docker, Node, Rust)
2. ✅ Crea archivos `.env`
3. ✅ Instala dependencias NPM
4. ✅ Levanta infraestructura Docker
5. ✅ Build WASM (si wasm-pack disponible)

### Opción 2: Manual

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Infraestructura
cd ../infra
cp .env.example .env
docker-compose up -d
```

---

## 🚀 Probar la Aplicación

### Frontend (UI)

```bash
cd frontend
npm run dev
```

Abre: `http://localhost:5173`

**Flujo de prueba:**
1. Click "Create New Wallet"
2. Autoriza con biometría
3. Ver tu Unified Address
4. Tab "Receive" → Ver QR code
5. Tab "Send" → Simular envío (stub)

### Backend (API)

```bash
# Health check
curl http://localhost:8080/health

# Blockchain info
curl http://localhost:8080/api/blocks/head

# Crear usuario
curl -X POST http://localhost:8080/api/users
```

---

## 📁 Archivos Importantes

| Archivo | Qué es |
|---------|--------|
| `docs/README.md` | Documentación completa (setup, arquitectura, API) |
| `docs/MVP_SUMMARY_AND_GAP_REPORT.md` | **GAP REPORT** - Lo implementado y lo que falta |
| `docs/ASSUMPTIONS.md` | Decisiones técnicas |
| `backend/openapi.yaml` | API specification |
| `PROJECT_STRUCTURE.md` | Estructura del proyecto |

---

## ⚠️ Importante Saber

### ✅ Lo que funciona

- ✅ Infraestructura completa (Docker)
- ✅ Backend API con todas las rutas
- ✅ Frontend UI completo (diseño blanco/negro)
- ✅ WebAuthn/Passkey authentication
- ✅ Base de datos con schema completo
- ✅ Documentación exhaustiva

### ⚠️ Lo que son stubs (requieren implementación)

- ⚠️ **WASM con librustzcash** - Genera placeholders, no llaves reales
- ⚠️ **Backend lightwalletd** - Mock responses, no queries reales
- ⚠️ **Frontend sync** - Simula sync, no lee blockchain real
- ⚠️ **Key encryption** - Stub, no usa Argon2+AES real

### ❌ Lo que NO está (fuera de MVP scope)

- ❌ Multi-pool (solo Orchard)
- ❌ Hardware wallets
- ❌ Fee estimation
- ❌ Mobile apps
- ❌ Mainnet support

**Ver gap analysis completo:** `docs/MVP_SUMMARY_AND_GAP_REPORT.md`

---

## 🐛 Troubleshooting Rápido

### "Docker no funciona"
```bash
docker ps
# Si no hay servicios, revisar:
cd infra && docker-compose logs
```

### "Backend no responde"
```bash
# Check si está corriendo
curl http://localhost:8080/health

# Ver logs
docker logs -f zcash-wallet-backend
```

### "Frontend no carga"
```bash
cd frontend
npm install
npm run dev
```

### "WebAuthn no funciona"
- ✅ Necesitas HTTPS en producción (localhost OK para dev)
- ✅ Navegador compatible (Chrome 108+, Safari 16+, Edge 108+)
- ✅ Dispositivo con biometría o security key

---

## 🔐 SSL Setup (Producción)

```bash
# 1. Configurar DNS
# zcash.socialmask.org → Tu IP

# 2. Ejecutar script SSL
sudo ./scripts/setup-ssl.sh

# 3. Verificar
curl https://zcash.socialmask.org
```

---

## 📊 Métricas

- **43 archivos** creados
- **~4,400 líneas de código**
- **8 componentes React**
- **10 API endpoints**
- **12 funciones WASM** (stubs)
- **5 tablas de base de datos**

---

## 🎓 Siguiente Paso

**Para desarrolladores:**
→ Lee `docs/MVP_SUMMARY_AND_GAP_REPORT.md` para entender gaps

**Para deployment:**
→ Lee `docs/README.md` sección "Deployment"

**Para testear:**
→ `cd frontend && npm run dev` y prueba UI

---

## 📞 Ayuda

- **Gap Report:** `docs/MVP_SUMMARY_AND_GAP_REPORT.md`
- **Documentación completa:** `docs/README.md`
- **Estructura proyecto:** `PROJECT_STRUCTURE.md`
- **API spec:** `backend/openapi.yaml`

---

**Implementado por:** Claude Code
**Fecha:** 2025-10-20
**Status:** ✅ MVP Completo con arquitectura funcional y stubs documentados
