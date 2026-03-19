# Barrier Breaker: Render Deployment Guide

This project is ready to deploy on Render without changing the UI.

## What Is Already Configured

- `server.py` reads the server port from `PORT`
- `server.py` protects admin routes with `ADMIN_KEY`
- research logs are stored in SQLite on the server
- `render.yaml` is included for Render Blueprint deployment
- `requirements.txt` is included

## GitHub Upload Commands

Open Terminal and run:

```bash
cd /Users/zacharoula/codex/barrier-breaker-forensic-mode
rm -rf __pycache__
rm -f research_logs.sqlite3
git init
git branch -M main
git add .
git commit -m "Prepare Barrier Breaker for Render deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPOSITORY` with your real GitHub values.

## Render Steps

1. Sign in to Render.
2. Click `New +`.
3. Choose `Blueprint`.
4. Connect your GitHub repository.
5. Select this project repository.
6. Render will read `render.yaml` automatically.
7. In the environment settings, add:

```text
ADMIN_KEY=your-strong-secret-key
```

8. Deploy the service.

## Important Note About SQLite

By default, logs are written to:

```text
/tmp/research_logs.sqlite3
```

This works, but `/tmp` is not permanent on Render.

If you want long-term persistence, use a persistent disk and set:

```text
LOG_DB_PATH=/path/on/render-disk/research_logs.sqlite3
```

## Admin Access

Admin and research endpoints require the correct `ADMIN_KEY`.

Examples:

- `/admin`
- `/admin/dashboard`
- `/api/admin/logs`
- `/api/admin/logs.csv`

