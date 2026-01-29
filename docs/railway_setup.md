# Railway Deployment Guide (Backend + Dashboard)

Currently, your Railway service is running the **Backend Flywheel** (`flywheel.ts`), which is why you only see "SKR Flywheel Active".

To see the **Dashboard UI**, you need to deploy it as a separate service (or configure the current one to run the frontend, but separating them is best practice).

## Architecture

1.  **Service A (Backend)**: Runs `flywheel.ts`. Handles buybacks, fees, and API.
    *   **Root Directory**: `/`
    *   **Start Command**: `npm start`
    *   **Port**: 8080 (or $PORT)
2.  **Service B (Dashboard)**: Runs the Next.js Frontend.
    *   **Root Directory**: `/dashboard`
    *   **Start Command**: `npm run start`
    *   **Port**: 3000

## Instructions to Fix

### Option 1: Add a Second Service (Recommended)

1.  Go to your Railway Project.
2.  Click **+ New** -> **GitHub Repo**.
3.  Select the **SAME Repo** (`SKR`).
4.  Click on the new service to open **Settings**.
5.  **Root Directory**: Change from `/` to `/dashboard`.
6.  **Environment Variables**:
    *   `NEXT_PUBLIC_ISG_MINT`: `BAszjaGWSJJiSuzAxAH5VfY8Vx8sBwxy9eK5yfyqpump`
    *   `NEXT_PUBLIC_SKR_MINT`: `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
    *   `FLYWHEEL_API_URL`: **IMPORTANT!** Set this to the public URL of your **Backend Service** (e.g., `https://dashboard-production-5825.up.railway.app` - assuming that's the backend).
    *   Note: While building, Next.js might need `FLYWHEEL_API_URL` to pre-render. If it fails, fallback to a placeholder.

### Option 2: Monorepo (Concurrent Run) - Advanced

If you only want one service, we have to modify `package.json` to build *both* and run *both*. This is harder to debug and not recommended for scale, but cheaper (1 service).

**We recommend Option 1.**

## Next Steps for You
1.  Add the new service in Railway pointing to `/dashboard`.
2.  Link the API URL so the frontend can talk to the backend.
