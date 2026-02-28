# Real-Time Geo-Sync (Tracker & Tracked)

## Overview

This project is a real-time map synchronization system built using React, Node.js, and Socket.io.

Two users join a shared session (room) and take one of the following roles:

- **Tracker** – Controls the map movement.
- **Tracked** – Receives synchronized updates in real time.

The objective was to implement smooth, low-latency synchronization while handling edge cases such as disconnections and preventing excessive socket emissions.

---

## Tech Stack

Frontend:
- React (Vite)
- React-Leaflet
- Socket.io Client

Backend:
- Node.js
- Express
- Socket.io

---

## Core Functionality

- Users join a room using a unique ID.
- Only one Tracker is allowed per room.
- Tracker’s map movements (lat, lng, zoom) are broadcast via sockets.
- Tracked user’s map updates instantly to match the Tracker.
- Map movement emissions are throttled (~12 updates per second).
- Tracked user cannot override the Tracker’s position while active.
- Tracker disconnection is detected and handled gracefully.
- Rooms are cleaned up when users leave.

---

## HUD Information

Both users see:
- Current latitude and longitude
- Zoom level
- Room ID
- Connection status
- Tracker active / disconnected state

---

## Environment Variable (Frontend)

Create a `.env` file inside the `frontend` folder:

VITE_BACKEND_URL=http://localhost:5000

---

## Deployment

- Backend deployed on Render
- Frontend deployed on Vercel



## How to run both client and server

- Backend:

- cd backend
- npm install
- npm start

- Frontend:

- cd frontend
- npm install
- npm run dev