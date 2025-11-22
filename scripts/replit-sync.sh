#!/bin/bash

set -e

echo "🔄 Pulling latest code from GitHub (main)"
git fetch origin
git reset --hard origin/main

echo "📦 Installing dependencies"
npm install --silent || npm install

echo "✅ Sync complete. If the app doesn't restart automatically, click Run."


