import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { browserSessionPersistence, connectAuthEmulator, getAuth, initializeAuth, inMemoryPersistence } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { FIREBASE_CONFIG } from "./config";

/** Emulador local opcional: abre la página con ?emulador=1 (Auth 9099, Firestore 8080). */
const EMULADOR = typeof location !== "undefined" && new URLSearchParams(location.search).has("emulador");

export const app = initializeApp(FIREBASE_CONFIG);
// Sesión por pestaña (igual que antes con sessionStorage): se cierra al cerrar el navegador.
export const auth = initializeAuth(app, { persistence: browserSessionPersistence });
export const db = getFirestore(app);

if (EMULADOR) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

/**
 * Instancia secundaria para que el administrador cree usuarios sin perder su propia sesión
 * (createUserWithEmailAndPassword inicia sesión en la instancia donde se llama).
 */
export async function conAppSecundaria<T>(fn: (a: ReturnType<typeof getAuth>) => Promise<T>): Promise<T> {
  const sec: FirebaseApp = initializeApp(FIREBASE_CONFIG, `alta-${Date.now()}`);
  const a = initializeAuth(sec, { persistence: inMemoryPersistence });
  if (EMULADOR) connectAuthEmulator(a, "http://127.0.0.1:9099", { disableWarnings: true });
  try {
    return await fn(a);
  } finally {
    await a.signOut().catch(() => {});
    await deleteApp(sec).catch(() => {});
  }
}
