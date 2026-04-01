import mongoose from "mongoose";
import { logError, logInfo } from "../utils/logger.js";

/**
 * Establishes a MongoDB connection using Mongoose.
 * @returns {Promise<void>}
 */
export async function connectDatabase() {
	const mongoUri = process.env.MONGODB_URI;

	if (!mongoUri) {
		throw new Error("MONGODB_URI is not configured in environment variables.");
	}

	mongoose.set("strictQuery", true);

	try {
		await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 10000,
			autoIndex: true
		});
		logInfo("MongoDB connected", { database: mongoose.connection.name });
	} catch (error) {
		logError("MongoDB connection failed", { error: error.message });
		throw error;
	}
}
