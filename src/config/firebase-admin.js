// src/config/firebase-admin.js
import "dotenv/config"; // Add this at the very top
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

function required(name) {
  const v = process.env[name];
  if (!v || v.trim() === "" || v === "undefined" || v === "null") {
    throw new Error(`[firebase-admin] Missing required env var: ${name}`);
  }
  return v;
}

function normalizePrivateKey(raw) {
  const unquoted =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1)
      : raw;
  return unquoted.replace(/\\n/g, "\n");
}

const PROJECT_ID = required("FIREBASE_PROJECT_ID");
const CLIENT_EMAIL = required("FIREBASE_CLIENT_EMAIL");
const PRIVATE_KEY = normalizePrivateKey(required("FIREBASE_PRIVATE_KEY"));

const firebaseAdminConfig = {
  credential: cert({
    project_id: PROJECT_ID,
    client_email: CLIENT_EMAIL,
    private_key: PRIVATE_KEY,
  }),
};

const adminApp =
  getApps().find((a) => a.name === "admin") ||
  initializeApp(firebaseAdminConfig, "admin");

const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);
const FieldValues = admin.firestore.FieldValue;

export { adminAuth, adminDb, adminApp, FieldValues }; // Changed from module.exports
