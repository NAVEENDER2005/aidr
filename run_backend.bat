@echo off
cd /d "%~dp0backend"
set PYTHONUTF8=1
echo Starting AIDR FastAPI Backend on http://localhost:8000 ...
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
