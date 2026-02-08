# WhatsApp Service

Standalone Node.js service for handling WhatsApp Web connections.

## Setup

```bash
cd whatsapp-service
npm install
```

## Run

```bash
npm start
```

Or with auto-reload:
```bash
npm run dev
```

## Endpoints

### GET /health
Health check

### GET /status
Get WhatsApp connection status and QR code

### POST /initialize
Initialize WhatsApp client

### POST /send
Send WhatsApp message
```json
{
  "phoneNumber": "+966501234567",
  "message": "Hello!"
}
```

### POST /disconnect
Disconnect WhatsApp client

## Port

Runs on **port 3001**
