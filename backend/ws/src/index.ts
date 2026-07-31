import http from "http";
import { WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const PORT = Number(process.env.PORT) || 3001;

const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ws ok");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
});

server.listen(PORT, () => {
    console.log(`WebSocket server listening on ${PORT}`);
});
