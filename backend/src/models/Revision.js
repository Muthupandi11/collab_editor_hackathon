import mongoose from "mongoose";

const { Schema, model } = mongoose;

const revisionSchema = new Schema(
	{
		docId: {
			type: String,
			required: true,
			index: true,
			trim: true
		},
		roomId: {
			type: String,
			default: "",
			trim: true
		},
		content: {
			type: String,
			required: true,
			default: ""
		},
		preview: {
			type: String,
			default: ""
		},
		timestamp: {
			type: Date,
			default: Date.now,
			index: true
		},
		createdBy: {
			type: String,
			default: "system"
		}
	},
	{
		versionKey: false
	}
);

revisionSchema.index({ docId: 1, timestamp: -1 });

const Revision = model("Revision", revisionSchema);

export default Revision;
