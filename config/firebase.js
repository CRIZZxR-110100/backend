const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let db = null;

try {
  if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log("🔥 Firebase Admin inicializado.");
    db = admin.firestore();
  } else {
    console.warn("⚠️ Faltan variables de entorno de Firebase. Usando MOCK de datos en memoria para propósitos de prueba.");
  }
} catch (error) {
  console.error("Error al inicializar Firebase Admin:", error);
}

module.exports = { admin, db };
