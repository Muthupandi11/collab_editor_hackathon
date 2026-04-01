import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { registerCollaborationSocket } from "./socket/collaborationSocket.js";
import { logError, logInfo } from "./utils/logger.js";

const PORT = Number.parseInt(process.env.PORT || "4000", 10);

const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
		credentials: true
	}
});

registerCollaborationSocket(io);

connectDatabase()
	.then(() => {
		httpServer.listen(PORT, () => {
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
