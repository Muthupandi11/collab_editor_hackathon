import cors from "cors";
import express from "express";
import documentRoutes from "./routes/documentRoutes.js";

const app = express();

app.use(
	cors({
		origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
		credentials: true
	})
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
	res.status(200).json({ status: "ok" });
});

app.use("/api/documents", documentRoutes);

export default app;
