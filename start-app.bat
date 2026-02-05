@echo off
echo Starting Reva AI...

start "Reva AI Server" cmd /k "cd server && npm start"
start "Reva AI Client" cmd /k "cd client && npm run dev"

echo Application started!
echo Server running on http://localhost:3001
echo Client running on http://localhost:5173 (usually)
pause
