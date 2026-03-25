import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    date: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      required: true,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

scheduleSchema.index({ userId: 1, date: 1, startTime: 1 });

export const ScheduleModel = mongoose.model("Schedule", scheduleSchema);
