#!/usr/bin/env bash
# Uruchamia pulpit lokalnie na http://localhost:8080
set -e
cd "$(dirname "$0")"
echo "Pulpit doradcy: http://localhost:8080"
python3 -m http.server 8080
