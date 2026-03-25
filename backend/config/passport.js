import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserModel } from "../models/User.js";

const getRequiredEnv = (key) => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is missing. Add it to backend/.env`);
  }
  return value;
};

export const configurePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: getRequiredEnv("GOOGLE_CLIENT_ID"),
        clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
        callbackURL: getRequiredEnv("GOOGLE_CALLBACK_URL"),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) {
            done(new Error("Google account does not provide an email"));
            return;
          }

          const displayName = (profile.displayName ?? "").trim();
          const existing = await UserModel.findOne({ email });

          if (existing) {
            if (!existing.name && displayName) {
              existing.name = displayName;
              await existing.save();
            }
            done(null, existing);
            return;
          }

          const randomPassword = crypto.randomBytes(24).toString("hex");
          const hashedPassword = await bcrypt.hash(randomPassword, 12);

          const createdUser = await UserModel.create({
            email,
            name: displayName,
            password: hashedPassword,
          });

          done(null, createdUser);
        } catch (error) {
          done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await UserModel.findById(id);
      done(null, user ?? false);
    } catch (error) {
      done(error);
    }
  });
};
