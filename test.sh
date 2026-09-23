#!/bin/bash
# Tabernacle VR - Automated Test Script
# Tests the application and checks for errors

echo "=== Tabernacle VR Test Script ==="
echo ""

# Kill any existing servers
pkill -f "serve dist" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

sleep 1

# Start the server
echo "Starting server..."
cd /opt/data/tabernacle-vr
npx -y serve dist -l 3001 -s &
SERVER_PID=$!

sleep 3

# Check if server is running
if curl -s http://localhost:3001/ | grep -q "Stiftshütte"; then
  echo "✓ Server is running"
else
  echo "✗ Server failed to start"
  exit 1
fi

# Run the tests
echo ""
echo "Running tests..."
node -e "
const http = require('http');

function checkPage() {
  return new Promise((resolve) => {
    http.get('http://localhost:3001/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          hasTitle: data.includes('Stiftshütte'),
          hasRoot: data.includes('id=\"root\"'),
          hasScripts: data.includes('.js'),
        });
      });
    }).on('error', () => resolve(null));
  });
}

checkPage().then(result => {
  console.log('Page Check:', JSON.stringify(result, null, 2));
  process.exit(0);
});
"

# Clean up
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "=== Test Complete ==="