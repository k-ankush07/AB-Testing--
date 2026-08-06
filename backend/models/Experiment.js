import mongoose from "mongoose";
import { randomUUID } from "crypto";

const testGroupSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    percent: { type: Number, required: true },
  },
  { _id: false },
);

const modificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    selector: { type: String, required: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["text", "html", "image", "hide"],
    },
    originalHTML: { type: String, default: "" },
    groupValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const experimentSchema = new mongoose.Schema(
  {
    experimentId: {
      type: String,
      default: () => randomUUID(),
      unique: true,
    },
    shop: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "active", "paused", "ended"],
      default: "pending",
    },
    testGroups: [testGroupSchema],
    countries: { type: [String], default: [] },
    modifications: [modificationSchema],
    visitors: { type: Number, default: 0 },
    toolbarExited: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Experiment", experimentSchema);
