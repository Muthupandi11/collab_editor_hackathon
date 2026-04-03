import cors from "cors";
import express from "express";
import mammoth from "mammoth";
import multer from "multer";
import fetch from "node-fetch";
import * as pdfParsePackage from "pdf-parse";
import documentRoutes from "./routes/documentRoutes.js";
import revisionsRoutes from "./routes/revisions.js";

const pdfParse = pdfParsePackage.default || pdfParsePackage;

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

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 20 * 1024 * 1024 }
});

const escapeHtml = (str) =>
	String(str || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

const sanitizeDocxHtml = (rawHtml) => {
	let html = String(rawHtml || "");
	html = html.replace(/<(\w+)[^>]*>/g, "<$1>");
	html = html.replace(/<(span|div|section|article)>/gi, "");
	html = html.replace(/<\/(span|div|section|article)>/gi, "");
	html = html.replace(/<img[^>]*>/gi, "");
	html = html.replace(/<table>[\s\S]*?<\/table>/gi, "<p>[Table not supported - content omitted]</p>");

	// Keep only heading/paragraph tags for TipTap-safe parsing.
	html = html.replace(/<(?!\/?(p|h1|h2|h3|h4|h5|h6)\b)[^>]+>/gi, "");
	html = html.replace(/<p>\s*<\/p>/gi, "");
	html = html.replace(/<h[1-6]>\s*<\/h[1-6]>/gi, "");

	return html.trim() || "<p>Document appears to be empty or contains only images.</p>";
};

const textToParagraphHtml = (rawText) => {
	const paragraphs = String(rawText || "")
		.split(/\n{2,}/)
		.map((line) => line.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
		.filter((line) => line.length > 0);

	if (paragraphs.length === 0) {
		return "";
	}

	return paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
};

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

app.get("/api/import/test", (_req, res) => {
	res.json({
		success: true,
		message: "Import routes working",
		mammoth: !!mammoth,
		pdfParse: !!pdfParse
	});
});

app.post("/api/import/docx", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, error: "No file uploaded" });
		}

		const result = await mammoth.convertToHtml(
			{ buffer: req.file.buffer },
			{
				styleMap: [
					"p[style-name='Heading 1'] => h1:fresh",
					"p[style-name='Heading 2'] => h2:fresh",
					"p[style-name='Heading 3'] => h3:fresh",
					"p[style-name='Title'] => h1:fresh"
				]
			}
		);

		const html = sanitizeDocxHtml(result?.value || "");
		return res.json({ success: true, html });
	} catch (error) {
		console.error("DOCX import error:", error);
		return res.status(500).json({ success: false, error: `Failed to convert Word file: ${error.message}` });
	}
});

app.post("/api/import/pdf", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, error: "No file uploaded" });
		}

		let data;
		try {
			data = await pdfParse(req.file.buffer);
		} catch {
			return res.status(400).json({
				success: false,
				error: "Cannot read PDF. File may be corrupted or password-protected."
			});
		}

		if (!data?.text || !data.text.trim()) {
			return res.status(400).json({
				success: false,
				error: "No text found in PDF. This may be a scanned or image-based PDF."
			});
		}

		const html = textToParagraphHtml(data.text);
		if (!html) {
			return res.status(400).json({
				success: false,
				error: "Could not extract readable text from PDF."
			});
		}

		const wordCount = String(data.text)
			.trim()
			.split(/\s+/)
			.filter(Boolean).length;

		return res.json({ success: true, html, pageCount: data.numpages || 0, wordCount });
	} catch (error) {
		console.error("PDF import error:", error);
		return res.status(500).json({ success: false, error: `PDF processing failed: ${error.message}` });
	}
});

app.post("/api/import/gdocs", async (req, res) => {
	try {
		const { docId } = req.body || {};
		if (!docId || typeof docId !== "string") {
			return res.status(400).json({ success: false, error: "Invalid document ID" });
		}

		if (!/^[a-zA-Z0-9_-]+$/.test(docId)) {
			return res.status(400).json({ success: false, error: "Invalid Google Docs document ID format" });
		}

		const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
		let response;
		try {
			response = await fetch(exportUrl, {
				headers: {
					"User-Agent": "Mozilla/5.0",
					Accept: "text/plain"
				},
				signal: AbortSignal.timeout(10000)
			});
		} catch {
			return res.status(400).json({
				success: false,
				error: "Could not reach Google Docs. Check internet connection."
			});
		}

		if (response.status === 401 || response.status === 403) {
			return res.status(400).json({
				success: false,
				error: "Google Doc is private. Go to Share -> Anyone with link -> Viewer."
			});
		}

		if (response.status === 404) {
			return res.status(400).json({
				success: false,
				error: "Google Doc not found. Check the URL is correct."
			});
		}

		if (!response.ok) {
			return res.status(400).json({ success: false, error: `Google returned error: ${response.status}` });
		}

		const text = await response.text();
		if (!text || text.trim().length < 5) {
			return res.status(400).json({
				success: false,
				error: "Google Doc appears empty or could not be read."
			});
		}

		const html = textToParagraphHtml(text);
		if (!html) {
			return res.status(400).json({ success: false, error: "No content received from Google Doc." });
		}

		return res.json({ success: true, html });
	} catch (error) {
		console.error("Google Docs import error:", error);
		return res.status(500).json({ success: false, error: `Import failed: ${error.message}` });
	}
});

// Mount document APIs after import routes so import endpoints cannot be shadowed.
app.use("/api/documents", documentRoutes);
app.use("/api/revisions", revisionsRoutes);

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
