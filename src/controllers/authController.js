import * as adminKit from "../config/firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";

const { adminAuth, adminDb } = adminKit;

// 🔹 Email/Password signup
export const signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await adminAuth.createUser({ email, password });
    res.json({ success: true, uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 🔹 Google Login
export const googleLogin = async (req, res) => {
  const { idToken } = req.body;

  console.log("idToken", idToken);

  try {
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Reference to user document
    const userRef = adminDb.collection("users").doc(uid);

    // Check if user exists
    const userDoc = await userRef.get();

    const userData = {
      email: decodedToken.email,
      name: decodedToken.name || "",
      picture: decodedToken.picture || "",
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!userDoc.exists) {
      // New user - add createdAt
      userData.createdAt = FieldValue.serverTimestamp();
    }

    // Save/update user in Firestore
    await userRef.set(userData, { merge: true });

    res.json({
      success: true,
      uid,
      user: {
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        role: "buyer",
      },
      isNewUser: !userDoc.exists,
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ success: false, error: error.message });
  }
};
