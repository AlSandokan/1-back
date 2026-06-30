import { auth, db } from "./firebase.js";
import { iniciarMonitoreoSesion } from "./services/sesion.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_UID = "NQ0CU5PSDBUgVrk56sjPEVhOs2D3";
const LIMITE_EVENTOS = 250;

let eventosAuditoria = [];

iniciarMonitoreoSesion("Panel administracion");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (user.uid !== ADMIN_UID) {
    alert("Acceso restringido al administrador.");
    window.location.href = "dashboard.html";
    return;
  }

  document.body.classList.remove("bloqueado");
  configurarFiltros();
  await cargarResumen();
  await cargarAuditoria();
});

function configurarFiltros() {
  ["filtroAuditoria", "filtroRol", "filtroModulo", "filtroResultado"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", renderizarAuditoria);
    document.getElementById(id)?.addEventListener("change", renderizarAuditoria);
  });

  document.getElementById("btnActualizarAuditoria")?.addEventListener("click", async () => {
    await cargarResumen();
    await cargarAuditoria();
  });
}

async function cargarResumen() {
  const snapUsuarios = await getDocs(collection(db, "usuarios"));
  const snapAuditoria = await getDocs(collection(db, "auditoria"));

  let totalUsuarios = 0;
  let totalPacientes = 0;
  let totalMedicos = 0;
  let totalInactividad = 0;

  snapUsuarios.forEach((docUsuario) => {
    totalUsuarios++;
    const datos = docUsuario.data();
    if (datos.rol === "paciente") totalPacientes++;
    if (datos.rol === "medico") totalMedicos++;
  });

  snapAuditoria.forEach((docEvento) => {
    if (docEvento.data().accion === "sesion_inactiva") totalInactividad++;
  });

  ponerTexto("totalUsuarios", totalUsuarios);
  ponerTexto("totalPacientes", totalPacientes);
  ponerTexto("totalMedicos", totalMedicos);
  ponerTexto("totalAuditoria", snapAuditoria.size);
  ponerTexto("totalInactividad", totalInactividad);
}

async function cargarAuditoria() {
  const qAuditoria = query(
    collection(db, "auditoria"),
    orderBy("fecha", "desc"),
    limit(LIMITE_EVENTOS)
  );

  const snap = await getDocs(qAuditoria);
  eventosAuditoria = snap.docs.map((docEvento) => ({
    id: docEvento.id,
    ...docEvento.data()
  }));

  llenarFiltroModulos();
  renderizarAuditoria();
}

function llenarFiltroModulos() {
  const filtroModulo = document.getElementById("filtroModulo");
  if (!filtroModulo) return;

  const valorActual = filtroModulo.value;
  const modulos = [...new Set(eventosAuditoria.map((e) => e.modulo).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  filtroModulo.innerHTML = "<option value=\"\">Todos los modulos</option>";
  modulos.forEach((modulo) => {
    const option = document.createElement("option");
    option.value = modulo;
    option.textContent = modulo;
    filtroModulo.appendChild(option);
  });

  filtroModulo.value = modulos.includes(valorActual) ? valorActual : "";
}

function renderizarAuditoria() {
  const tabla = document.getElementById("tablaAuditoria");
  if (!tabla) return;

  const texto = normalizar(document.getElementById("filtroAuditoria")?.value || "");
  const rol = document.getElementById("filtroRol")?.value || "";
  const modulo = document.getElementById("filtroModulo")?.value || "";
  const resultado = document.getElementById("filtroResultado")?.value || "";

  const eventos = eventosAuditoria.filter((evento) => {
    const coincideTexto = !texto || normalizar([
      evento.usuarioNombre,
      evento.usuarioUid,
      evento.usuarioRol,
      evento.modulo,
      evento.accion,
      evento.descripcion,
      evento.pacienteNombre,
      evento.pacienteUid
    ].join(" ")).includes(texto);

    const coincideRol = !rol || evento.usuarioRol === rol;
    const coincideModulo = !modulo || evento.modulo === modulo;
    const coincideResultado = !resultado || String(Boolean(evento.exito)) === resultado;

    return coincideTexto && coincideRol && coincideModulo && coincideResultado;
  });

  if (!eventos.length) {
    tabla.innerHTML = "<tr><td colspan=\"8\">No hay eventos con esos filtros.</td></tr>";
    return;
  }

  tabla.innerHTML = eventos.map((evento) => {
    const fecha = evento.fechaTexto
      ? new Date(evento.fechaTexto).toLocaleString("es-MX")
      : "Sin fecha";

    const resultadoHTML = evento.exito
      ? "<span class=\"ok\">Correcto</span>"
      : "<span class=\"error\">Error</span>";

    return `
      <tr>
        <td>${escaparHTML(fecha)}</td>
        <td>
          <strong>${escaparHTML(evento.usuarioNombre || "-")}</strong>
          <small>${escaparHTML(evento.usuarioUid || "")}</small>
        </td>
        <td>${escaparHTML(evento.usuarioRol || "-")}</td>
        <td>${escaparHTML(evento.modulo || "-")}</td>
        <td>
          <strong>${escaparHTML(evento.accion || "-")}</strong>
          <small>${escaparHTML(evento.descripcion || "")}</small>
        </td>
        <td>
          ${escaparHTML(evento.pacienteNombre || "-")}
          <small>${escaparHTML(evento.pacienteUid || "")}</small>
        </td>
        <td>${resultadoHTML}</td>
        <td>
          <details>
            <summary>Ver</summary>
            <pre>${escaparHTML(JSON.stringify(evento.detalles || {}, null, 2))}</pre>
          </details>
        </td>
      </tr>
    `;
  }).join("");
}

function ponerTexto(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

function normalizar(valor) {
  return String(valor).trim().toLowerCase();
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
