import cors from "cors";
import express from "express";
import documentRoutes from "./routes/documentRoutes.js";
import revisionsRoutes from "./routes/revisions.js";

const app = express();

// CORS configuration with multiple origins
const getAllowedOrigins = () => {
	const origins = [
		"http://localhost:5173",
		"http://localhost:3000",
		"http://localhost:5000"
	];
	
	if (process.env.FRONTEND_URL) {
		origins.push(process.env.FRONTEND_URL);
	}
	
	return origins;
};

const corsOptions = {
	origin: (origin, callback) => {
		const allowedOrigins = getAllowedOrigins();
		
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error("CORS not allowed"), false);
		}
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"]
};

// CORS middleware FIRST before all routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "1mb" }));

app.get("/ping", (_req, res) => {
	res.status(200).json({ status: "alive", time: Date.now() });
});

app.get("/health", async (_req, res) => {
	try {
		const { connection } = await import("mongoose");
		const isConnected = connection.readyState === 1;
		res.status(200).json({ 
			status: isConnected ? "healthy" : "unhealthy",
			database: isConnected ? "connected" : "disconnected",
			time: Date.now()
		});
	} catch (error) {
		res.status(503).json({ 
			status: "unhealthy",
			error: error.message
		});
	}
});

app.use("/api/documents", documentRoutes);
app.use("/api/revisions", revisionsRoutes);

export default app;
