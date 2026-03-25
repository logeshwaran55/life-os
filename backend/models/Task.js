import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
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
    values: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    completed: {
      type: Boolean,
      required: true,
      default: false,
    },
    createdAt: {
      type: String,
      required: true,
    },
    completedAt: {
      type: String,
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

taskSchema.index({ userId: 1, id: 1 }, { unique: true });

export const TaskModel = mongoose.model("Task", taskSchema);
