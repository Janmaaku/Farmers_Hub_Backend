import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  ),
});

export default admin;
