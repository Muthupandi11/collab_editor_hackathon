import "dotenv/config";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { registerCollaborationSocket } from "./socket/collaborationSocket.js";
import { logError, logInfo } from "./utils/logger.js";

const PORT = Number.parseInt(process.env.PORT || "10000", 10);
const HOST = "0.0.0.0";

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
	},
	pingTimeout: 60000,
	pingInterval: 25000,
	transports: ["websocket", "polling"],
	allowEIO3: true
});

registerCollaborationSocket(io);

connectDatabase()
	.then(() => {
		httpServer.listen(PORT, HOST, () => {
			console.log(
				JSON.stringify({
					message: "Server listening",
					port: PORT,
					host: HOST
				})
			);
			logInfo("Server listening", { port: PORT, host: HOST });
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

process.on("SIGTERM", () => {
	console.log("SIGTERM received, shutting down gracefully");
	httpServer.close(() => {
		mongoose.connection.close(false).finally(() => {
			console.log("Server and MongoDB closed");
			process.exit(0);
		});
	});
});

process.on("SIGINT", () => {
	process.exit(0);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled Rejection:", reason);
});
