import admin from "../config/firebase.js";

// 🔹 Email/Password signup
export const signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    res.json({ success: true, uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 🔹 Google Login
export const googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // (Optional) Save to Firestore users collection
    // await admin.firestore().collection("users").doc(uid).set({
    //   email: decodedToken.email,
    //   name: decodedToken.name,
    //   picture: decodedToken.picture,
    // }, { merge: true });

    res.json({ success: true, uid, user: decodedToken });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
};
