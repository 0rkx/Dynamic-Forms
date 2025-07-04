@echo off
echo Manifesto Repair Utility
echo =====================================================

REM Check if .env file exists
if not exist .env (
  echo ERROR: .env file not found!
  echo Create a .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY variables
  exit /b 1
)

REM Load environment variables from .env
for /f "tokens=*" %%a in (.env) do (
  set %%a
)

REM Check if required variables are set
if not defined SUPABASE_URL (
  echo ERROR: SUPABASE_URL is not defined in .env file!
  exit /b 1
)

if not defined SUPABASE_SERVICE_KEY (
  echo ERROR: SUPABASE_SERVICE_KEY is not defined in .env file!
  exit /b 1
)

echo Starting manifesto repair...
echo.

REM Run repair script
node functions/repair-manifestos.js %*

if %ERRORLEVEL% neq 0 (
  echo.
  echo Repair failed with errors. Check the output above for details.
  echo If you want to force repair of all manifestos, run with --force flag.
  pause
  exit /b %ERRORLEVEL%
) else (
  echo.
  echo Repair completed successfully!
  pause
) 