# Run this script from PowerShell inside the autoservice-booking directory
# to initialize the repository and push to GitHub.
#
# Prerequisites:
#   1. Install Git for Windows: https://git-scm.com/download/win
#   2. Create an empty GitHub repo named "autoservice-booking"
#   3. Replace YOUR_USERNAME below with your GitHub username

$GITHUB_USERNAME = "mrevg11"
$REPO_NAME = "Autoservice-Booking"

# Init
git init
git checkout -b main

# Stage all files
git add .

# Verify no .env files are staged
Write-Host "`n--- Checking for .env files in staging area ---"
$envFiles = git diff --cached --name-only | Where-Object { $_ -match '\.env' }
if ($envFiles) {
    Write-Host "WARNING: .env files detected in staging:" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "Run: git rm --cached <file> to unstage them." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "OK: No .env files staged." -ForegroundColor Green
}

# First commit
git commit -m "feat: AutoService Booking System — complete diploma project

Stages 1-7:
- NestJS 10 REST API with JWT auth, TypeORM, MySQL 8
- React 18 SPA with role-based routing (CLIENT/MASTER/ADMIN)
- AI modules: SlotSuggester, Recommendations, DurationPredictor
- Email notifications (7 Handlebars templates + cron reminders)
- Unit tests: backend 72% (121 tests), frontend 60% (64 tests)
- E2E tests: Playwright 5 spec files, 25+ scenarios
- Load tests: k6 p95<1000ms, error<1% at 100 users
- CI/CD: GitHub Actions (lint -> test -> build -> deploy)
- Deploy: Render Free Tier (Web Service + Static + MySQL)"

# Push to GitHub
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
git push -u origin main

Write-Host "`nDone! Check https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor Green
