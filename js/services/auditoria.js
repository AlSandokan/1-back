import { db } from "../firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function registrarEventoAuditoria({
  accion,
  modulo,
  descripcion,
  usuarioUid,
  usuarioNombre = "",
  usuarioRol = "",
  pacienteUid = "",
  pacienteNombre = "",
  exito = true,
  detalles = {}
}) {
  try {
    await addDoc(collection(db, "auditoria"), {
      accion,
      modulo,
      descripcion,
      usuarioUid,
      usuarioNombre,
      usuarioRol,
      pacienteUid,
      pacienteNombre,
      exito,
      detalles,
      navegador: navigator.userAgent,
      idioma: navigator.language,
      plataforma: navigator.platform,
      ruta: window.location.pathname,
      url: window.location.href,
      fecha: serverTimestamp(),
      fechaTexto: new Date().toISOString()
    });
  } catch (error) {
    console.error("ERROR AUDITORIA:", error);
    throw error;
  }
}

export function resumenError(error) {
  if (!error) return {};
  return {
    codigo: error.code || "",
    mensaje: error.message || String(error)
  };
}
