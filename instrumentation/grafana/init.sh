#!/bin/sh

ADMIN_USER=admin
ADMIN_PASS="${GF_SECURITY_ADMIN_PASSWORD:-admin}"

VIEWER_USER="${GF_VIEWER_USER:-readonly}"
VIEWER_PASS="${GF_VIEWER_PASSWORD:-readonly}"

API="http://localhost:3000/api"

# Wait for Grafana to be ready
until curl -sf "$API/health" >/dev/null 2>&1; do
  sleep 1
done

# Wait a bit more for auth system to initialize
sleep 5

# Retry logic for API calls
MAX_RETRIES=10
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
  # Test if API is ready by checking admin auth works
  if curl -sf -u "$ADMIN_USER:$ADMIN_PASS" "$API/org" >/dev/null 2>&1; then
    break
  fi
  RETRY=$((RETRY + 1))
  sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "init.sh: Failed to authenticate with Grafana API after $MAX_RETRIES retries"
  exit 1
fi

# Check if user exists (grep for the login in response)
LOOKUP=$(curl -sf -u "$ADMIN_USER:$ADMIN_PASS" \
  "$API/users/lookup?loginOrEmail=$VIEWER_USER" 2>/dev/null || echo "")

if echo "$LOOKUP" | grep -q '"id"'; then
  # User exists - extract ID using sed
  USER_ID=$(echo "$LOOKUP" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
  echo "init.sh: User '$VIEWER_USER' already exists with ID $USER_ID"
else
  # Create user
  RESULT=$(curl -sf -u "$ADMIN_USER:$ADMIN_PASS" \
    -X POST "$API/admin/users" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$VIEWER_USER\",
      \"email\": \"${VIEWER_USER}@example.com\",
      \"login\": \"$VIEWER_USER\",
      \"password\": \"$VIEWER_PASS\"
    }" 2>/dev/null || echo "")

  USER_ID=$(echo "$RESULT" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')

  if [ -n "$USER_ID" ]; then
    echo "init.sh: Created user '$VIEWER_USER' with ID $USER_ID"
  else
    echo "init.sh: Failed to create user '$VIEWER_USER'. Response: $RESULT"
  fi
fi

# Set role to Viewer if we have a user ID
if [ -n "$USER_ID" ]; then
  curl -sf -u "$ADMIN_USER:$ADMIN_PASS" \
    -X PATCH "$API/org/users/$USER_ID" \
    -H "Content-Type: application/json" \
    -d '{ "role": "Viewer" }' >/dev/null 2>&1 || true
  echo "init.sh: Set role to Viewer for user ID $USER_ID"
fi
