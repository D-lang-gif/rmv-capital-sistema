/**
 * Inicio de sesión con usuario + contraseña sobre Firebase Auth (correo sintético).
 * - "soberano": primero se valida contra el hash PBKDF2 local (credencial.ts). Si es correcto y la cuenta
 *   de Firebase aún no existe, se crea con la misma contraseña escrita (nunca se guarda en claro) y se
 *   registra config/admin = { uid } (solo se puede crear una vez; ver firestore.rules).
 * - Usuarios: Firebase Auth + documento usuarios/{uid}; estado "baja" = acceso bloqueado.
 */
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/app";
import { USUARIO_ADMIN, correoDe } from "@/lib/firebase/config";
import { limpiarClave, verificarAcceso } from "./verificar";

export type ResultadoAcceso =
  | { ok: true; rol: "admin"; nube: boolean; aviso?: string }
  | { ok: true; rol: "usuario"; uid: string; debeCambiarClave: boolean }
  | { ok: false; error: string };

const codigo = (e: unknown) => (e as { code?: string })?.code ?? "";
const NO_EXISTE = ["auth/user-not-found", "auth/invalid-credential", "auth/invalid-login-credentials"];
const SIN_RED = ["auth/network-request-failed", "auth/internal-error"];

/** Garantiza config/admin y usuarios/{uid} del administrador. Lanza si otro uid ya es admin. */
async function asegurarAdmin(user: User): Promise<void> {
  const cfg = doc(db, "config", "admin");
  const s = await getDoc(cfg);
  if (!s.exists()) await setDoc(cfg, { uid: user.uid, creadoEn: new Date().toISOString() });
  else if (s.data().uid !== user.uid) throw Object.assign(new Error("admin-ajeno"), { code: "rmv/admin-ajeno" });
  const perfil = doc(db, "usuarios", user.uid);
  if (!(await getDoc(perfil)).exists()) {
    await setDoc(perfil, {
      usuario: USUARIO_ADMIN, nombre: "RMV Bank Soberano", correo: "", telefono: "", tipo: "persona",
      rol: "admin", estado: "activa", debeCambiarClave: false, creadoEn: new Date().toISOString(), bajaEn: null,
    });
  }
}

export async function iniciarSesion(usuarioEscrito: string, claveEscrita: string): Promise<ResultadoAcceso> {
  const usuario = usuarioEscrito.trim().toLowerCase();
  const clave = limpiarClave(claveEscrita);
  const correo = correoDe(usuario);

  if (usuario === USUARIO_ADMIN) {
    // 1) Verificación local (PBKDF2-SHA256). Sin esto no se toca Firebase.
    if (!(await verificarAcceso(usuario, claveEscrita))) return { ok: false, error: "Usuario o contraseña incorrectos." };
    // 2) Firebase: entrar o, la primera vez, crear la cuenta con la misma contraseña.
    try {
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, correo, clave);
      } catch (e) {
        if (!NO_EXISTE.includes(codigo(e))) throw e;
        try {
          cred = await createUserWithEmailAndPassword(auth, correo, clave);
        } catch (e2) {
          if (codigo(e2) === "auth/email-already-in-use") {
            return { ok: true, rol: "admin", nube: false, aviso: "La cuenta de nube del administrador tiene otra contraseña. Banca › Usuarios queda sin conexión." };
          }
          throw e2;
        }
      }
      try {
        await asegurarAdmin(cred.user);
      } catch (e) {
        if (codigo(e) === "rmv/admin-ajeno") {
          await signOut(auth);
          return { ok: true, rol: "admin", nube: false, aviso: "Otra cuenta figura como administrador en la nube. Revisa config/admin en Firestore." };
        }
        // Reglas aún no publicadas o sin red: se entra igual (los demás módulos son locales).
        return { ok: true, rol: "admin", nube: false, aviso: "Sin conexión con la base de datos en la nube (¿reglas de Firestore publicadas?)." };
      }
      return { ok: true, rol: "admin", nube: true };
    } catch (e) {
      return {
        ok: true, rol: "admin", nube: false,
        aviso: SIN_RED.includes(codigo(e)) ? "Sin conexión con la nube." : "No se pudo iniciar la sesión de nube.",
      };
    }
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, correo, clave);
    const perfil = await getDoc(doc(db, "usuarios", cred.user.uid));
    if (!perfil.exists() || perfil.data().estado !== "activa" || perfil.data().rol !== "usuario") {
      await signOut(auth);
      return { ok: false, error: perfil.exists() && perfil.data().estado === "baja" ? "Este usuario fue dado de baja y no tiene acceso." : "Usuario o contraseña incorrectos." };
    }
    return { ok: true, rol: "usuario", uid: cred.user.uid, debeCambiarClave: perfil.data().debeCambiarClave === true };
  } catch (e) {
    await signOut(auth).catch(() => {});
    const c = codigo(e);
    if (NO_EXISTE.includes(c) || c === "auth/wrong-password" || c === "auth/invalid-email") return { ok: false, error: "Usuario o contraseña incorrectos." };
    if (c === "auth/too-many-requests") return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
    if (c.includes("permission-denied")) return { ok: false, error: "La nube no está lista todavía (reglas de Firestore sin publicar)." };
    return { ok: false, error: "Sin conexión con la nube. Intenta de nuevo." };
  }
}

/** Cambia la contraseña propia (reautentica con la actual y usa updatePassword). */
export async function cambiarClavePropia(actual: string, nueva: string): Promise<void> {
  const u = auth.currentUser;
  if (!u?.email) throw new Error("Sesión no iniciada.");
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, limpiarClave(actual)));
  } catch {
    throw new Error("Contraseña actual incorrecta.");
  }
  await updatePassword(u, limpiarClave(nueva));
  await updateDoc(doc(db, "usuarios", u.uid), { debeCambiarClave: false }).catch(() => {});
}

export async function cerrarSesionNube(): Promise<void> {
  await signOut(auth).catch(() => {});
}
