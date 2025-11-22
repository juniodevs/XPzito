@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo [setup] Installing workspace dependencies...
call npm install || goto :error
echo [setup] Building API workspace...
call npm run build --workspace api || goto :error
call npm run build --workspace web || goto :error
echo [setup] Done.
exit /b 0

:error
echo [setup] Failed with error code %errorlevel%.
exit /b %errorlevel%
