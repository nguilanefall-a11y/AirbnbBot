#!/usr/bin/env python3
"""
Script isolé pour répondre à Aziz
Utilise subprocess pour isoler Playwright de l'event loop
"""
import subprocess
import sys
from pathlib import Path

def main():
    script_path = Path(__file__).parent.parent / "scripts" / "reply_to_aziz_core.py"
    
    # Lancer dans un nouveau processus Python pour isoler l'event loop
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=False,
        text=True
    )
    
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())


