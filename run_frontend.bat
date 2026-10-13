@echo off
cd /d "%~dp0frontend"
set PATH=C:\Windows\System32;%PATH%
echo Starting AIDR Vite Frontend on http://localhost:5173 ...
npx vite --host 127.0.0.1 --port 5173
pause
