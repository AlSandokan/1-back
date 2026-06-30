import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  obtenerUsuario
} from "./services/usuarios.js";
import { registrarEventoAuditoria } from "./services/auditoria.js";
import { iniciarMonitoreoSesion } from "./services/sesion.js";

iniciarMonitoreoSesion("Dashboard");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const datos = await obtenerUsuario(user.uid);

  if (datos) {
    document.getElementById("bienvenida").innerText =
      "Bienvenido, " + datos.nombre;
  } else {
    document.getElementById("bienvenida").innerText =
      "Bienvenido";
  }
});

window.cerrarSesion = async function() {
  const user = auth.currentUser;
  const datos = user ? await obtenerUsuario(user.uid) : null;
  if (user) {
    await registrarEventoAuditoria({
      accion: "cierre_sesion",
      modulo: "Dashboard",
      descripcion: "El usuario cerro sesion explicitamente desde dashboard.",
      usuarioUid: user.uid,
      usuarioNombre: datos?.nombre || user.email || "",
      usuarioRol: datos?.rol || "",
      exito: true
    });
  }
  await signOut(auth);
  window.location.href = "login.html";
};
