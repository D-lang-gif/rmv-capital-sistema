/** Configuración web de Firebase (pública por diseño; la seguridad la dan las reglas de Firestore). */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0RYe9kW5bFYIwplVnS_CHXehdCWrOV0k",
  authDomain: "rmv-banca-soberana.firebaseapp.com",
  projectId: "rmv-banca-soberana",
  storageBucket: "rmv-banca-soberana.firebasestorage.app",
  messagingSenderId: "362278419506",
  appId: "1:362278419506:web:ba163d3c9591f271fd902b",
};

/** Dominio de los correos sintéticos: <usuario>@rmv-banca-soberana.firebaseapp.com */
export const DOMINIO_USUARIOS = "rmv-banca-soberana.firebaseapp.com";
export const USUARIO_ADMIN = "soberano";

export const correoDe = (usuario: string) => `${usuario.trim().toLowerCase()}@${DOMINIO_USUARIOS}`;
