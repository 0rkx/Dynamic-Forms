@echo off
echo Installing Node.js dependencies for backend functions...

cd functions
npm install

if %ERRORLEVEL% neq 0 (
  echo.
  echo Installation failed! Please ensure Node.js is installed.
  pause
  exit /b %ERRORLEVEL%
) else (
  echo.
  echo Installation completed successfully!
  echo Now you can run the repair-manifestos.bat script.
  pause
) 