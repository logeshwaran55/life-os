import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 32,
    },
    avatar: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

export const UserModel = mongoose.model("User", userSchema);
