@echo off
title Twyn API
cd /d C:\Users\hardi\twyn\api
.venv\Scripts\python -m uvicorn app.main:app --port 8100
pause
