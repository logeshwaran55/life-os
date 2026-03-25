import mongoose from "mongoose";

const columnSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["text", "date", "number", "select"],
    },
    options: {
      type: [String],
      default: undefined,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

columnSchema.index({ userId: 1, id: 1 }, { unique: true });

export const ColumnModel = mongoose.model("Column", columnSchema);
