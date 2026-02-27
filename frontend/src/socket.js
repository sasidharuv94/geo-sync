import { io } from "socket.io-client";

const socket = io("https://geo-sync-l2ql.onrender.com");

export default socket;