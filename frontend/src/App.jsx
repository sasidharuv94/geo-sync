import { useState, useEffect } from "react";
import socket from "./socket";
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from "react-leaflet";
import { CircleMarker } from "react-leaflet";
import { throttle } from "lodash";
import { useMap } from "react-leaflet";
import "./App.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";




// Fix Leaflet default icon issue in production
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});




function MapEvents({ role, roomId }) {
  const sendUpdate = throttle((map) => {
    const center = map.getCenter();
    const zoom = map.getZoom();

    socket.emit("mapMove", {
      roomId,
      lat: center.lat,
      lng: center.lng,
      zoom,
    });
  }, 80); // 80ms throttle (~12 updates per second)

  useMapEvents({
  move: function () {
    if (role === "tracker") {
      const center = this.getCenter();

      // emit live drag position
      socket.emit("trackerDragging", {
        roomId,
        lat: center.lat,
        lng: center.lng,
      });

      sendUpdate(this); // keep throttled map sync
    }
  },
});

  return null;
}





function MapUpdater({ lat, lng, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom]);

  return null;
}







function App() {
  const [roomId, setRoomId] = useState("");
  const [role, setRole] = useState("tracker");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [trackerActive, setTrackerActive] = useState(false);
  const [mapState, setMapState] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [trackerPosition, setTrackerPosition] = useState(null);
  const [trackerDragPosition, setTrackerDragPosition] = useState(null);
  
  



  const disableMapControl =
  joined && role === "tracked" && trackerActive === true;




  useEffect(() => {
  socket.on("joinedSuccessfully", (data) => {
    setJoined(true);
    setMessage(`Joined as ${data.role}`);
  });

  socket.on("errorMessage", (msg) => {
    setMessage(msg);
  });

  return () => {
    socket.off("joinedSuccessfully");
    socket.off("errorMessage");
    
  };
}, []);














useEffect(() => {
  const handleTrackerStatus = (data) => {
    setTrackerActive(data.active);
  };

  socket.on("trackerStatus", handleTrackerStatus);

  return () => {
    socket.off("trackerStatus", handleTrackerStatus);
  };
}, []);






useEffect(() => {
  socket.on("mapUpdate", (data) => {
    if (role === "tracked") {
      setMapState({
        lat: data.lat,
        lng: data.lng,
        zoom: data.zoom,
      });

      // 🔴 Set tracker final position
      setTrackerPosition({
        lat: data.lat,
        lng: data.lng,
      });
    }
  });

  return () => {
    socket.off("mapUpdate");
  };
}, [role]);









useEffect(() => {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
  (position) => {
    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    setUserLocation(location);

    setMapState({
      lat: location.lat,
      lng: location.lng,
      zoom: 13,
    });
  }
);
}, []);







useEffect(() => {
  socket.on("trackerDraggingUpdate", (data) => {
    if (role === "tracked") {
      setTrackerDragPosition({
        lat: data.lat,
        lng: data.lng,
      });
    }
  });

  return () => {
    socket.off("trackerDraggingUpdate");
  };
}, [role]);









  const handleJoin = () => {
    if (!roomId) {
      setMessage("Please enter Room ID");
      return;
    }

    socket.emit("joinRoom", { roomId, role });
  };



 const handleLeave = () => {
  socket.emit("leaveRoom", { roomId, role });

  setJoined(false);
  setTrackerActive(false);
  setTrackerPosition(null);
  setTrackerDragPosition(null);
};



  if (!mapState) {
  return <div style={{ padding: 20 }}>Fetching your location...</div>;
}






 if (!joined) {
  return (
    <div className="join-wrapper">
      <div className="join-card">
        <h2>Join Session</h2>

        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="tracker">Tracker</option>
          <option value="tracked">Tracked</option>
        </select>

        <button onClick={handleJoin}>Join Room</button>

        <p style={{ color: "red" }}>{message}</p>
      </div>
    </div>
  );
}





  return (
    <div className="app-container">
      <MapContainer
  center={[mapState.lat, mapState.lng]}
  zoom={mapState.zoom}
  style={{ height: "100%", width: "100%" }}
  dragging={!disableMapControl}
  scrollWheelZoom={!disableMapControl}
  doubleClickZoom={!disableMapControl}
  touchZoom={!disableMapControl}
  boxZoom={!disableMapControl}
  keyboard={!disableMapControl}
>
  <TileLayer
    attribution="&copy; OpenStreetMap contributors"
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />

  {/* 🟦 BLUE MARKER – User's own location */}
  {userLocation && (
    <Marker position={[userLocation.lat, userLocation.lng]}>
      <Popup>Your Location</Popup>
    </Marker>
  )}

  {/* 🔴 RED MARKER – Tracker final position (only for tracked) */}
  {trackerPosition && role === "tracked" && (
    <Marker position={[trackerPosition.lat, trackerPosition.lng]}>
      <Popup>Tracker Location</Popup>
    </Marker>
  )}

  {/* 🟣 PURPLE MARKER – Live drag indicator */}
  {trackerDragPosition && role === "tracked" && (
    <CircleMarker
      center={[trackerDragPosition.lat, trackerDragPosition.lng]}
      radius={8}
      pathOptions={{ color: "purple" }}
    />
  )}

  <MapEvents role={role} roomId={roomId} />

  <MapUpdater
    lat={mapState.lat}
    lng={mapState.lng}
    zoom={mapState.zoom}
  />

  {/* HUD */}
  <div
    style={{
      position: "absolute",
      top: 20,
      right: 20,
      background: "white",
      padding: 12,
      borderRadius: 8,
      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      zIndex: 1000,
      fontSize: 14,
    }}
    className="hud"
  >
    <strong>
      {role === "tracker" ? "🟢 Tracker" : "🔵 Tracked"}
    </strong>
     <br />
    {trackerActive && (
  <div className="live-indicator">
    <span className="live-dot"></span> LIVE
  </div>
)}
   
Room Id: <strong>{roomId}</strong>

    <br />
    Lat: {mapState.lat.toFixed(8)}
    <br />
    Lng: {mapState.lng.toFixed(8)}
    <br />
    Zoom: {mapState.zoom}
    <br />
    Status: {socket.connected ? "Connected" : "Disconnected"}
    {role === "tracked" && !trackerActive && (
      <>
        <br />
        <span style={{ color: "red", fontWeight: "bold" }}>
          Tracker Disconnected
        </span>
      </>
    )}
    <br />
<button className="leave-btn" onClick={handleLeave}>
  Leave Room
</button>
  </div>
</MapContainer>
      
    </div>
  );
}

export default App;