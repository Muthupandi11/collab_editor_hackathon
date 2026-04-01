import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { registerCollaborationSocket } from "./socket/collaborationSocket.js";
import { logError, logInfo } from "./utils/logger.js";

const PORT = Number.parseInt(process.env.PORT || "4000", 10);

const httpServer = createServer(app);
// Dynamic CORS origins for Socket.IO
const getAllowedOrigins = () => {
	const origins = [
		"http://localhost:5173",
		"http://localhost:3000",
		"http://localhost:5000"
	];
	if (process.env.FRONTEND_URL) {
		origins.push(process.env.FRONTEND_URL);
	}
	if (process.env.CLIENT_ORIGIN) {
		origins.push(process.env.CLIENT_ORIGIN);
	}
	return [...new Set(origins)];
};

const io = new Server(httpServer, {
	cors: {
		origin: getAllowedOrigins(),
		credentials: true,
		methods: ["GET", "POST"]
	}
});

registerCollaborationSocket(io);

connectDatabase()
	.then(() => {
		httpServer.listen(PORT, "0.0.0.0", () => {
			logInfo("Server listening", { port: PORT });
		});
	})
	.catch((error) => {
		logError("Database bootstrap failed", { error: error.message });
		process.exit(1);
	});

httpServer.on("error", (error) => {
	logError("Server failed to start", { error: error.message });
	process.exit(1);
});
