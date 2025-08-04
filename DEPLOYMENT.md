# Deployment Guide

## Build Process for Production

This application requires a specific build process to ensure client files are properly accessible to the production server.

### Quick Deploy

Run the complete build script:

```bash
node build-for-deployment.js
```

This script will:
1. Clean previous builds
2. Build the client application (React/Vite)
3. Build the server application (Express/esbuild)
4. Copy client files to the server's expected location
5. Verify all files are in place

### Manual Build Process

If you prefer to run the build steps manually:

```bash
# 1. Clean previous builds
rm -rf dist/

# 2. Build client
vite build

# 3. Build server
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server

# 4. Copy client files to server location
node scripts/post-build.js
```

### File Structure After Build

```
dist/
├── public/                    # Client build output from Vite
│   ├── index.html
│   └── assets/
└── server/                    # Server build output
    ├── index.js              # Main server file
    └── public/               # Client files copied here
        ├── index.html
        └── assets/
```

### Running in Production

After building:

```bash
NODE_ENV=production node dist/server/index.js
```

### Key Points

- The server expects client files in `dist/server/public/`
- Vite builds client files to `dist/public/`
- The post-build script copies files from `dist/public/` to `dist/server/public/`
- Both the original `npm run build` and the new `build-for-deployment.js` script handle this copying

### Environment Variables

Ensure these environment variables are set in production:
- `DATABASE_URL` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `PORT` - Server port (defaults to 5000)

### Health Check

The server provides a health check endpoint at `/health` for monitoring deployment status.