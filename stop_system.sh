#!/bin/bash
cd "$(dirname "$0")"

echo "🛑 Arrêt système Airbnb Automation"

if [ -f logs/api.pid ]; then
    kill $(cat logs/api.pid) 2>/dev/null || true
    rm logs/api.pid
    echo "   ✅ API arrêtée"
fi

if [ -f logs/all_workers.pid ]; then
    kill $(cat logs/all_workers.pid) 2>/dev/null || true
    rm logs/all_workers.pid
    echo "   ✅ Workers arrêtés"
fi

pkill -9 chromium 2>/dev/null || true
echo ""
echo "✅ Système arrêté"
