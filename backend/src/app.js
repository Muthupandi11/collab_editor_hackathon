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

	if (process.env.CLIENT_ORIGIN) {
		origins.push(process.env.CLIENT_ORIGIN);
	}
	
	return [...new Set(origins)];
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
	allowedHeaders: ["Content-Type", "Authorization", "Accept"]
};

// CORS middleware FIRST before all routes
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
	res.status(200).json({
		status: "ok",
		message: "Collab Editor Backend Running",
		timestamp: new Date().toISOString(),
		uptime: process.uptime()
	});
});

app.get("/ping", (_req, res) => {
	res.status(200).json({ status: "alive", time: Date.now() });
});

app.get("/health", async (_req, res) => {
	try {
		const { connection } = await import("mongoose");
		const isConnected = connection.readyState === 1;
		res.status(200).json({
			status: "healthy",
			mongodb: isConnected ? "connected" : "disconnected",
			timestamp: new Date().toISOString(),
			uptime: process.uptime()
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

const extractBodyHtml = (rawHtml) => {
	const source = String(rawHtml || "");
	const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
	const content = bodyMatch ? bodyMatch[1] : source;

	const cleaned = content
		.replace(/<!--([\s\S]*?)-->/g, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<(iframe|object|embed|link|meta|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "")
		.replace(/<(iframe|object|embed|link|meta|noscript)[^>]*\/?\s*>/gi, "")
		.replace(/\sclass="[^"]*"/gi, "")
		.replace(/\sid="[^"]*"/gi, "")
		.replace(/\sstyle="[^"]*"/gi, "")
		.trim();

	return cleaned || "<p></p>";
};

const textToParagraphHtml = (rawText) => {
	const safe = String(rawText || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	const html = safe
		.split(/\n\n+/)
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) => `<p>${chunk.replace(/\n/g, "<br />")}</p>`)
		.join("");

	return html || "<p></p>";
};

app.post("/api/import/gdocs", async (req, res, next) => {
	try {
		const { docId } = req.body || {};
		if (!docId) {
			return res.status(400).json({ success: false, error: "docId is required" });
		}

		const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
		const response = await fetch(exportUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0",
				Accept: "text/html,application/xhtml+xml"
			}
		});
		if (!response.ok) {
			throw new Error("Could not fetch Google Doc. Check sharing settings.");
		}

		const html = await response.text();
		const looksBlocked = /accounts\.google\.com|Sign in|ServiceLogin/i.test(html || "");
		let cleaned = extractBodyHtml(html);

		if (looksBlocked || cleaned === "<p></p>") {
			const txtUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
			const txtResponse = await fetch(txtUrl, {
				headers: {
					"User-Agent": "Mozilla/5.0",
					Accept: "text/plain,text/*;q=0.9,*/*;q=0.8"
				}
			});
			if (!txtResponse.ok) {
				throw new Error("Could not fetch Google Doc. Set sharing to Anyone with link can view.");
			}
			const txt = await txtResponse.text();
			cleaned = textToParagraphHtml(txt);
		}

		return res.json({ success: true, html: cleaned });
	} catch (error) {
		next(error);
	}
});

app.use((req, res) => {
	res.status(404).json({
		success: false,
		error: `Route not found: ${req.method} ${req.path}`
	});
});

app.use((err, req, res, _next) => {
	console.error("Global error:", err);
	res.status(err.status || 500).json({
		success: false,
		error: err.message || "Internal server error",
		path: req.path
	});
});

export default app;
