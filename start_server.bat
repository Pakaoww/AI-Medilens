@echo off
set PYTHONUTF8=1
cd /d "%~dp0backend"
py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
