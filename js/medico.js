import { medicoPuedeVer } from "./services/usuarios.js";

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let pacientesGlobal = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const accesoPermitido = await cargarPerfilMedico(user);

  if (!accesoPermitido) return;

  document.body.classList.remove("bloqueado");

  console.log("UID del médico:", user.uid);

  await cargarPacientes(user.uid);

  const buscador = document.getElementById("buscadorPacientes");

  if (buscador) {
    buscador.addEventListener("input", filtrarPacientes);
  }
});

async function cargarPerfilMedico(user) {
  const correo = user.email;

  document.getElementById("correoMedico").textContent = correo || "";

  const inicial = correo ? correo.charAt(0).toUpperCase() : "M";
  document.getElementById("avatarMedico").textContent = inicial;

  const refUsuario = doc(db, "usuarios", user.uid);
  const snapUsuario = await getDoc(refUsuario);

  if (!snapUsuario.exists()) {
    alert("Tu cuenta no está registrada en Cognición.");
    await auth.signOut();
    window.location.href = "login.html";
    return false;
  }

  const datos = snapUsuario.data();

  if (datos.rol !== "medico") {
    alert("Acceso restringido al personal médico.");
    await auth.signOut();
    window.location.href = "login.html";
    return false;
  }

  document.getElementById("nombreMedico").textContent =
    datos.nombre || "Médico sin nombre";

  return true;
}

async function cargarPacientes(uidMedico) {
  const lista = document.getElementById("listaPacientes");
  lista.innerHTML = "Cargando pacientes...";

  const refPacientes = collection(db, "usuarios");
  const snapshot = await getDocs(refPacientes);

  pacientesGlobal = [];

  for (const docPaciente of snapshot.docs) {
    const datos = docPaciente.data();

    if (datos.rol !== "paciente") continue;

    const puedeVer = await medicoPuedeVer(uidMedico, docPaciente.id);

    if (puedeVer) {
      pacientesGlobal.push({
        id: docPaciente.id,
        ...datos
      });
    }
  }

  pacientesGlobal.sort((a, b) => {
    const nombreA = (a.nombre || "").toLowerCase();
    const nombreB = (b.nombre || "").toLowerCase();
    return nombreA.localeCompare(nombreB);
  });

  mostrarPacientes(pacientesGlobal);
  calcularEstadisticas(pacientesGlobal);
}

function formatearDiagnostico(diagnostico) {
  if (!diagnostico) return "Sin diagnóstico";

  if (typeof diagnostico === "string") {
    return diagnostico.trim() || "Sin diagnóstico";
  }

  if (typeof diagnostico === "object") {
    const codigo = diagnostico.codigo ? `${diagnostico.codigo} - ` : "";
    const texto =
      diagnostico.texto ||
      diagnostico.nombre ||
      diagnostico.descripcion ||
      "";

    return `${codigo}${texto}`.trim() || "Sin diagnóstico";
  }

  return String(diagnostico);
}

function claveDiagnostico(diagnostico) {
  if (!diagnostico) return "";

  if (typeof diagnostico === "object") {
    return [
      diagnostico.codigo || "",
      diagnostico.texto || "",
      diagnostico.nombre || ""
    ].join("|");
  }

  return String(diagnostico);
}

function obtenerDiagnosticosPaciente(paciente) {
  const historial = Array.isArray(paciente.historialDiagnosticos)
    ? paciente.historialDiagnosticos
    : [];

  const principal =
    paciente.diagnostico ||
    historial[historial.length - 1] ||
    "";

  const clavePrincipal = claveDiagnostico(principal);
  const secundarios = historial.filter(
    (diagnostico) => claveDiagnostico(diagnostico) !== clavePrincipal
  );

  if (historial.length === 0 && paciente.diagnostico) {
    return {
      principal,
      secundarios: []
    };
  }

  return {
    principal,
    secundarios
  };
}

function mostrarPacientes(pacientes) {
  const lista = document.getElementById("listaPacientes");
  lista.innerHTML = "";

  if (pacientes.length === 0) {
    lista.innerHTML = `
      <p class="paciente-vacio">
        No hay pacientes registrados.
      </p>
    `;
    return;
  }

  pacientes.forEach((paciente) => {
    const nombre = paciente.nombre || "Paciente sin nombre";
    const edad = paciente.edad ? `${paciente.edad} años` : "No registrada";
    const diagnosticos = obtenerDiagnosticosPaciente(paciente);
    const diagnosticoPrincipal = formatearDiagnostico(diagnosticos.principal);
    const diagnosticosSecundarios = diagnosticos.secundarios
      .map(formatearDiagnostico)
      .filter(Boolean);
    const secundariosHtml = diagnosticosSecundarios.length > 0
      ? `
        <div class="diagnosticos-secundarios">
          <span class="diagnosticos-secundarios-titulo">Secundarios</span>
          ${diagnosticosSecundarios
            .map((diagnostico) => `<span>${diagnostico}</span>`)
            .join("")}
        </div>
      `
      : "";
    const ultimaConsulta = paciente.ultimaConsulta || "Sin registro";
    const proximaConsulta = paciente.proximaConsulta || "Sin programar";

    lista.innerHTML += `
      <a class="fila-paciente" href="paciente.html?id=${paciente.id}">
        <span class="paciente-nombre">${nombre}</span>
        <span class="paciente-dato">${edad}</span>
        <span class="paciente-dato diagnostico-columna">
        <span class="diagnostico-texto">
          <span class="diagnostico-principal">${diagnosticoPrincipal}</span>
          ${secundariosHtml}
        </span>
        </span>
        <span class="paciente-dato">${ultimaConsulta}</span>
        <span class="paciente-dato">${proximaConsulta}</span>
      </a>
    `;
  });
}

function filtrarPacientes() {
  const buscador = document.getElementById("buscadorPacientes");
  const texto = buscador ? buscador.value.toLowerCase() : "";

  const filtrados = pacientesGlobal.filter((paciente) => {
    const nombre = (paciente.nombre || "").toLowerCase();
    return nombre.includes(texto);
  });

  mostrarPacientes(filtrados);
}

function calcularEstadisticas(pacientes) {
  const total = pacientes.length;

  const activos = pacientes.filter(
    (paciente) => paciente.estado !== "pendiente"
  ).length;

  const pendientes = pacientes.filter(
    (paciente) => paciente.estado === "pendiente"
  ).length;

  document.getElementById("totalPacientes").textContent = total;
  document.getElementById("pacientesActivos").textContent = activos;
  document.getElementById("pacientesPendientes").textContent = pendientes;

  document.getElementById("expedientesHoy").textContent = 0;
}

document.addEventListener("click", (e) => {
  const diagnosticoTexto = e.target.closest(".diagnostico-texto");

  if (!diagnosticoTexto) return;

  // Evita que al hacer clic se abra el expediente del paciente
  e.preventDefault();
  e.stopPropagation();

  diagnosticoTexto.classList.toggle("expandido");

});

let columnaActual = null;
let tablaActual = null;
let inicioX = 0;
let anchoInicial = 0;

document.querySelectorAll(".resizer").forEach((resizer) => {
  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    tablaActual = resizer.closest(".tabla-pacientes");
    columnaActual = resizer.dataset.col;
    inicioX = e.clientX;

    anchoInicial = parseFloat(
      getComputedStyle(tablaActual)
        .getPropertyValue(columnaActual)
    );

    tablaActual.classList.add("redimensionando");
  });
});

document.addEventListener("mousemove", (e) => {
  if (!columnaActual || !tablaActual) return;

  const diferencia = e.clientX - inicioX;
  const nuevoAncho = Math.max(80, anchoInicial + diferencia);

  tablaActual.style.setProperty(
    columnaActual,
    `${nuevoAncho}px`
  );
});

document.addEventListener("mouseup", () => {
  if (tablaActual) {
    tablaActual.classList.remove("redimensionando");
  }

  columnaActual = null;
  tablaActual = null;
});
