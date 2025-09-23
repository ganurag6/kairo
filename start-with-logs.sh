#!/bin/bash
echo "Starting SnapWrite with logging..."
echo "Logs will be saved to snapwrite.log"
echo "Press Ctrl+C to stop"
echo "---"
npm start 2>&1 | tee snapwrite.log