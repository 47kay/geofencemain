#!/bin/bash
# admin-tool.sh

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Require authentication in production
if [ "$NODE_ENV" = "production" ]; then
  echo "Production environment detected."
  echo "Please enter administrator password:"
  read -s ADMIN_PASSWORD

  # Simple password check - in production you should use a more secure method
  if [ "$ADMIN_PASSWORD" != "$ADMIN_TOOL_PASSWORD" ]; then
    echo "Invalid password."
    exit 1
  fi

  echo "Authentication successful."
fi

# Run the tool
node scripts/admin-management.js