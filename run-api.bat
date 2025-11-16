@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo [api] Starting server...
call npm run start --workspace api
