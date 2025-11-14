import * as adminKit from "../config/firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";

const { adminAuth, adminDb } = adminKit;

// 🔹 Shared helper to create/update Firestore user doc
const upsertUserFromDecodedToken = async (decodedToken) => {
  const uid = decodedToken.uid;

  const userRef = adminDb.collection("users").doc(uid);
  const userDoc = await userRef.get();

  const existingData = userDoc.exists ? userDoc.data() : null;
  const isNewUser = !userDoc.exists;

  console.log("decodedToken.userRole", decodedToken.userRole);
  console.log("existing.userRole", existingData?.userRole);
  console.log("decodedToken.name", decodedToken.name);
  console.log("existing.name", existingData?.name);

  // Base fields that ALWAYS update
  const userData = {
    email: decodedToken.email || "",
    picture: decodedToken.picture || "",
    updatedAt: FieldValue.serverTimestamp(),
  };

  // 🔹 Only new users get their name and role from the token
  if (isNewUser) {
    userData.name = decodedToken.name || "";
    userData.userRole = decodedToken.userRole || "buyer";
    userData.createdAt = FieldValue.serverTimestamp();
  }

  // 🔹 Existing users keep stored name & userRole
  const finalName = existingData?.name || decodedToken.name || "";
  const finalUserRole =
    existingData?.userRole || decodedToken.userRole || "buyer";

  // Save/update Firestore
  await userRef.set(userData, { merge: true });

  const user = {
    email: userData.email,
    name: finalName,
    picture: userData.picture,
    userRole: finalUserRole,
    provider: decodedToken.firebase?.sign_in_provider || "unknown",
  };

  console.log("Returning user:", user);

  return {
    uid,
    user,
    isNewUser,
  };
};
// 🔹 Signup (email/password) – now uses idToken + same logic as googleLogin
// Frontend should create the user with Firebase client SDK, then send idToken here.
export const signup = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res
      .status(400)
      .json({ success: false, error: "idToken is required" });
  }

  try {
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Optional: ensure this is an email/password signup
    const provider = decodedToken.firebase?.sign_in_provider;
    if (provider !== "password") {
      return res.status(400).json({
        success: false,
        error: "This signup endpoint is only for email/password users.",
      });
    }

    const { uid, user, isNewUser } = await upsertUserFromDecodedToken(
      decodedToken
    );

    return res.json({
      success: true,
      uid,
      user,
      isNewUser,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(401).json({ success: false, error: error.message });
  }
};

// 🔹 Google Login – also strictly requires idToken, same upsert logic
export const googleLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res
      .status(400)
      .json({ success: false, error: "idToken is required" });
  }

  try {
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Optional: ensure this is a Google sign-in
    const provider = decodedToken.firebase?.sign_in_provider;
    if (provider !== "google.com") {
      return res.status(400).json({
        success: false,
        error: "This endpoint is only for Google sign-in.",
      });
    }

    const { uid, user, isNewUser } = await upsertUserFromDecodedToken(
      decodedToken
    );

    return res.json({
      success: true,
      uid,
      user,
      isNewUser,
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(401).json({ success: false, error: error.message });
  }
};
