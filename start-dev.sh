#!/bin/bash

# Terminal 1: Flask
cd backend
python app.py &

# Terminal 2: React
cd ../frontend
npm run dev