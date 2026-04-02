import mongoose from "mongoose";

const { Schema, model } = mongoose;

const revisionSchema = new Schema(
	{
		snapshot: {
			type: Buffer,
			required: true
		},
		summary: {
			type: String,
			default: "Auto snapshot"
		},
		createdBy: {
			type: String,
			default: "system"
		}
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
		_id: true
	}
);

const documentSchema = new Schema(
	{
		documentId: {
			type: String,
			required: true,
			unique: true,
			index: true,
			trim: true
		},
		title: {
			type: String,
			default: "Untitled Document",
			trim: true
		},
		content: {
			type: String,
			default: ""
		},
		lastModified: {
			type: Date,
			default: Date.now,
			index: true
		},
		yjsState: {
			type: Buffer,
			default: () => Buffer.from([])
		},
		createdBy: {
			type: String,
			default: "anonymous"
		},
		updatedBy: {
			type: String,
			default: "anonymous"
		},
		revisions: {
			type: [revisionSchema],
			default: []
		}
	},
	{
		timestamps: true,
		versionKey: false
	}
);

documentSchema.index({ updatedAt: -1 });

const Document = model("Document", documentSchema);

export default Document;
