# Proyecto GPS Backend

This directory contains a small Express backend for the Proyecto GPS frontend.

## Setup

```bash
cd backend
npm install
```

## Run

```bash
npm run dev
```

The server starts on `http://localhost:4000` by default.

## API Endpoints

 // todo

## Environment Variables

The backend loads configuration from `backend/.env` using `dotenv`.

Create `backend/.env` or copy from `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

Supported environment variables:

- `PORT` - backend HTTP port (default `4000`)
- `FRONTEND_ORIGIN` - allowed CORS origin for the frontend (default `http://localhost:5173`)
- `MONGODB_URI` - MongoDB connection string (default `mongodb://localhost:27017`)
- `MONGODB_DB` - MongoDB database name (default `proyecto_gps`)
- `ENCRYPTION_KEY` - **required** - 32-byte hex string for AES-256-GCM file encryption. Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### File Encryption

Files uploaded to the system are encrypted at rest using AES-256-GCM. Only authenticated users who own the file or have access through sharing can decrypt and download it.

- Each file gets a unique 16-byte IV (initialization vector)
- Files are encrypted with the master key defined in `ENCRYPTION_KEY`
- Encryption metadata (IV, auth tag) is stored with the file in the database
- Decryption only happens when an authorized user requests the download
- Access control is enforced: only the owner or shared users can decrypt

If MongoDB is not available, the backend will still start with fallback in-memory data for auth and documents.

## Frontend Integration

The frontend can call the backend at `http://localhost:4000/api/...` from development.
If you build the frontend and set `NODE_ENV=production`, the backend will also serve the frontend `build/` directory if available.
