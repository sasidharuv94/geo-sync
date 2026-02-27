const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
app.get("/", (req, res) => {
  res.send("Geo-Sync Server Running");
});


const rooms = {};


io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);







  socket.on("joinRoom", ({ roomId, role }) => {
  console.log(`User ${socket.id} joining room ${roomId} as ${role}`);

  if (!rooms[roomId]) {
    rooms[roomId] = { tracker: null, tracked: null };
  }

  // Role Assignment Logic
  if (role === "tracker") {
  if (rooms[roomId].tracker) {
    socket.emit("errorMessage", "Tracker already exists in this room.");
    return;
  }

  rooms[roomId].tracker = socket.id;

  // 🔥 Notify tracked user that tracker is active again
  socket.to(roomId).emit("trackerReconnected");
}

  if (role === "tracked") {
    if (rooms[roomId].tracked) {
      socket.emit("errorMessage", "Tracked already exists in this room.");
      return;
    }
    rooms[roomId].tracked = socket.id;
  }

  socket.join(roomId);



 
  socket.emit("joinedSuccessfully", { roomId, role });

   // After role assignment and room join

// If both users exist, notify tracked that tracker is active
if (rooms[roomId].tracker && rooms[roomId].tracked) {
  io.to(roomId).emit("trackerStatus", { active: true });
}


  console.log("Current Rooms:", rooms);
});











socket.on("mapMove", ({ roomId, lat, lng, zoom }) => {
  console.log("Map move received:", lat, lng, zoom);

  if (!rooms[roomId]) return;
  if (rooms[roomId].tracker !== socket.id) return;

  socket.to(roomId).emit("mapUpdate", { lat, lng, zoom });
});


socket.on("disconnect", () => {
  console.log("Client disconnected:", socket.id);

  for (const roomId in rooms) {
    if (rooms[roomId].tracker === socket.id) {
      console.log("Tracker left room:", roomId);

      // 🔥 Add this debug line
      console.log("Room state before emit:", rooms[roomId]);

      // 🔥 Add this debug line
      console.log("Emitting trackerDisconnected to room:", roomId);

      // Notify tracked user
      io.to(roomId).emit("trackerStatus", { active: false });

      rooms[roomId].tracker = null;
    }

    if (rooms[roomId].tracked === socket.id) {
      rooms[roomId].tracked = null;
    }

    // Cleanup empty room
    if (!rooms[roomId].tracker && !rooms[roomId].tracked) {
      delete rooms[roomId];
    }
  }
});





socket.on("trackerDragging", ({ roomId, lat, lng }) => {
  if (!rooms[roomId]) return;
  if (rooms[roomId].tracker !== socket.id) return;

  socket.to(roomId).emit("trackerDraggingUpdate", {
    lat,
    lng,
  });
});




socket.on("leaveRoom", ({ roomId, role }) => {
  if (!rooms[roomId]) return;

  if (role === "tracker") {
    rooms[roomId].tracker = null;

    io.to(roomId).emit("trackerStatus", { active: false });
  }

  if (role === "tracked") {
    rooms[roomId].tracked = null;
  }

  socket.leave(roomId);

  // Clean empty room
  if (!rooms[roomId].tracker && !rooms[roomId].tracked) {
    delete rooms[roomId];
  }

  console.log("User left room:", roomId);
});






});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});