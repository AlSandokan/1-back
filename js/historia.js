import { auth } from "./firebase.js";
import { registrarEventoAuditoria } from "./services/auditoria.js";
import { iniciarMonitoreoSesion } from "./services/sesion.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  obtenerUsuario
} from "./services/usuarios.js";

import {
  guardarHistoriaClinica,
  obtenerHistoriaClinica
} from "./services/historias.js";

let uidPaciente = null;

iniciarMonitoreoSesion("Historia clinica");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const usuario = await obtenerUsuario(user.uid);

  if (!usuario || usuario.rol !== "medico") {
    alert("Acceso restringido");
    window.location.href = "dashboard.html";
    return;
  }

  const parametros = new URLSearchParams(window.location.search);
  uidPaciente = parametros.get("id");
  if (!uidPaciente) return;

  await cargarPaciente();
  await cargarHistoria();
});

async function cargarPaciente() {
  const paciente = await obtenerUsuario(uidPaciente);
  if (!paciente) return;

  document.getElementById("nombrePaciente").textContent =
    paciente.nombre || "Paciente";

  document.getElementById("datosPaciente").textContent =
    `${paciente.edad || ""} anos`;
}

async function cargarHistoria() {
  const historia = await obtenerHistoriaClinica(uidPaciente);
  if (!historia.exists()) return;

  const datos = historia.data();

  Object.keys(datos).forEach((campo) => {
    const elemento = document.getElementById(campo);
    if (elemento) elemento.value = datos[campo];
  });
}

window.guardarHistoria = async () => {
  if (!uidPaciente) {
    alert("No hay paciente seleccionado. Abre esta historia desde el expediente o desde la lista de pacientes.");
    return;
  }

  const datos = {};
  document.querySelectorAll("input, textarea").forEach((campo) => {
    datos[campo.id] = campo.value;
  });

  await guardarHistoriaClinica(uidPaciente, datos);

  const usuario = auth.currentUser;
  const medico = usuario ? await obtenerUsuario(usuario.uid) : null;
  const paciente = await obtenerUsuario(uidPaciente);

  await registrarEventoAuditoria({
    accion: "guardar_historia_clinica",
    modulo: "Historia clinica",
    descripcion: "El medico guardo historia clinica.",
    usuarioUid: usuario?.uid || "",
    usuarioNombre: medico?.nombre || usuario?.email || "",
    usuarioRol: medico?.rol || "",
    pacienteUid: uidPaciente,
    pacienteNombre: paciente?.nombre || "",
    exito: true,
    detalles: {
      camposRegistrados: Object.values(datos).filter(Boolean).length
    }
  });

  alert("Historia clinica guardada.");
};

window.descargarHistoriaPDF = () => {
  window.print();
};

const tabs = document.querySelectorAll(".tab");
const secciones = document.querySelectorAll(".seccion");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("activo"));
    secciones.forEach((s) => s.classList.remove("activa"));

    tab.classList.add("activo");

    const seccion = document.getElementById(tab.dataset.seccion);
    if (seccion) seccion.classList.add("activa");
  });
});
