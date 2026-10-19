# Mint — Expense Tracker

React + Vite expense tracker with a Node/Express API, MongoDB persistence, JWT authentication and Tailwind CSS v4 available for utility-first styling.

## Deploy to Vercel

This repository is configured to deploy the frontend and API from one Vercel project. The Express API is exposed through a Vercel Node function under `/api/*`; the frontend uses same-origin `/api` requests by default.

1. Push this project to a GitHub repository. Do **not** commit `.env` files or `node_modules`.
2. In Vercel, import the repository and keep the **Root Directory** at the repository root (`mint-expense-app`).
3. Add these Project Environment Variables for Production (and Preview if needed):
   - `MONGODB_URI`: your MongoDB Atlas connection string. Ensure Atlas Network Access permits Vercel connections.
   - `JWT_SECRET`: a new, long random secret.
   - `CLIENT_URL`: your exact deployed origin, e.g. `https://your-project.vercel.app`. For previews, add the required preview origins as a comma-separated list or use separate project environment settings.
   - `VITE_API_URL`: optional. Leave unset for same-origin `/api` routing.
4. Deploy. Check `https://your-project.vercel.app/api/health` for `{ "status": "ok", "service": "mint-api" }`.

Vercel's filesystem is ephemeral. MongoDB is the persistent data store. The app does not require a separately hosted Express server when deployed with this configuration.

## Run locally

Use Node.js LTS. From the project root:

```bash
npm run install:all
cp .env.example server/.env
# Edit server/.env with a real MongoDB URI and JWT secret
npm run dev
```

Frontend: `http://localhost:5173`; local API: `http://localhost:5000/api`.

## Styling

Tailwind CSS v4 is installed through the Vite plugin and imported from `client/src/styles.css`. Existing component styles are retained to preserve the current app's appearance while you migrate individual JSX elements to Tailwind utility classes; theme tokens and complex chart/modal styling remain custom CSS for now.

## Security

Never commit secrets. If credentials were ever included in a shared archive or repository, rotate the MongoDB password and JWT secret before deploying.
