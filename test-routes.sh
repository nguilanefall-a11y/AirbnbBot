#!/bin/bash
echo "=== Test 1: /api/health ==="
curl -s http://localhost:3000/api/health
echo -e "\n"

echo "=== Test 2: /api/user (sans auth) ==="
curl -s http://localhost:3000/api/user
echo -e "\n"

echo "=== Test 3: /api/register ==="
curl -s -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test'$(date +%s)'@test.com","password":"Test1234!"}' \
  -c cookies.txt
echo -e "\n"

echo "=== Test 4: /api/login ==="
curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
echo -e "\n"

echo "=== Test 5: /api/cleaning/staff (avec auth) ==="
curl -s http://localhost:3000/api/cleaning/staff -b cookies.txt
echo -e "\n"

echo "=== Test 6: /api/reservation/test-key ==="
curl -s http://localhost:3000/api/reservation/test-key-12345
echo -e "\n"

rm -f cookies.txt
