# PUBG Mobile UC Top-Up Store

Modern, high-performance PUBG Mobile UC Top-Up web application with real-time Player UID verification and multi-region payment gateway integration.

## Features
- **Player Verification**: Real-time PUBG Mobile UID and in-game username check via Neferbyte API.
- **Multi-Country Support**:
  - **India**: INR pricing with UPI Gateway.
  - **Bangladesh**: BDT pricing with DivinePay (bKash, Nagad).
  - **Pakistan**: PKR pricing with EDPay (Easypaisa, JazzCash).
- **Backend API Endpoints**:
  - `/api/payment/create-order` — Order creation and gateway session checkout.
  - `/api/payment/callback` — Webhook callback handling with HMAC-SHA256 signature verification.
  - `/api/verify-player` — Player ID lookup.
- **Frontend Stack**: React 18, Vite, Tailwind CSS, Lucide icons, Motion.

## Deploying to Vercel
1. Import this repository into Vercel.
2. Framework Preset: **Vite**.
3. Root Directory: `./`.
4. Output Directory: `dist`.
5. Build Command: `npm run build`.
6. Click **Deploy**.
