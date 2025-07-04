#!/bin/bash

echo "Manifesto Repair Utility"
echo "====================================================="

# Check if .env file exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Create a .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY variables"
  exit 1
fi

# Load environment variables from .env
source .env

# Check if required variables are set
if [ -z "$SUPABASE_URL" ]; then
  echo "ERROR: SUPABASE_URL is not defined in .env file!"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "ERROR: SUPABASE_SERVICE_KEY is not defined in .env file!"
  exit 1
fi

echo "Starting manifesto repair..."
echo

# Run repair script
node functions/repair-manifestos.js "$@"

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo
  echo "Repair failed with errors. Check the output above for details."
  echo "If you want to force repair of all manifestos, run with --force flag."
  exit $EXIT_CODE
else
  echo
  echo "Repair completed successfully!"
fi 