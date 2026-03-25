import { Router } from "express";
import mongoose from "mongoose";
import { UserModel } from "../models/User.js";
import { TaskModel } from "../models/Task.js";
import { ColumnModel } from "../models/Column.js";

const router = Router();

const PHONE_REGEX = /^[0-9+()\-\s]{7,20}$/;
const AVATAR_PROTOCOL_REGEX = /^https?:\/\//i;

const formatUserProfile = (user) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name ?? "",
  phone: user.phone ?? "",
  avatar: user.avatar ?? "",
  createdAt: user.createdAt,
});

const ensureDatabaseConnected = (res) => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  res.status(503).json({ message: "Database is temporarily unavailable. Please try again shortly." });
  return false;
};

router.get("/profile", async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) {
      return;
    }

    const user = await UserModel.findById(req.user.id).lean();
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(formatUserProfile(user));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error: String(error) });
  }
});

router.put("/profile", async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) {
      return;
    }

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    const avatar = typeof req.body?.avatar === "string" ? req.body.avatar.trim() : "";

    if (name.length > 80) {
      res.status(400).json({ message: "Name must be 80 characters or fewer" });
      return;
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      res.status(400).json({ message: "Please enter a valid phone number" });
      return;
    }

    if (avatar && !AVATAR_PROTOCOL_REGEX.test(avatar)) {
      res.status(400).json({ message: "Avatar URL must start with http:// or https://" });
      return;
    }

    if (avatar.length > 500) {
      res.status(400).json({ message: "Avatar URL must be 500 characters or fewer" });
      return;
    }

    const updated = await UserModel.findByIdAndUpdate(
      req.user.id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(formatUserProfile(updated));
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: String(error) });
  }
});

router.delete("/account", async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) {
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const [deletedTasks, deletedColumns, deletedUser] = await Promise.all([
      TaskModel.deleteMany({ userId: userObjectId }),
      ColumnModel.deleteMany({ userId: userObjectId }),
      UserModel.findByIdAndDelete(req.user.id),
    ]);

    if (!deletedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      message: "Account deleted successfully",
      deletedTasks: deletedTasks.deletedCount,
      deletedColumns: deletedColumns.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete account", error: String(error) });
  }
});

export default router;
