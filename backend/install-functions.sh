#!/bin/bash

echo "Installing Node.js dependencies for backend functions..."

cd functions
npm install

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo
  echo "Installation failed! Please ensure Node.js is installed."
  exit $EXIT_CODE
else
  echo
  echo "Installation completed successfully!"
  echo "Now you can run the repair-manifestos.sh script."
fi 