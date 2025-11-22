#!/bin/sh
# Simple deploy script for a VPS
docker-compose pull
docker-compose up -d --build
