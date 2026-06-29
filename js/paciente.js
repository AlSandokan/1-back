import { auth } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  obtenerUsuario,
  actualizarUsuario,
  solicitarEliminacionPaciente,
  buscarMedicoPorCorreo,
  otorgarPermisoMedico,
  listarPermisosMedicos,
  cambiarRolPermisoMedico,
  revocarPermisoMedico
} from "./services/usuarios.js";

let uidPaciente = "";
let datosPacienteActual = null;

function formatearDiagnostico(diagnostico) {
  if (!diagnostico) return "Sin diagnostico";

  if (typeof diagnostico === "string") {
    return diagnostico.trim() || "Sin diagnostico";
  }

  if (typeof diagnostico === "object") {
    const codigo = diagnostico.codigo ? `${diagnostico.codigo} - ` : "";
    const texto =
      diagnostico.texto ||
      diagnostico.nombre ||
      diagnostico.descripcion ||
      "";

    return `${codigo}${texto}`.trim() || "Sin diagnostico";
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

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return "";

  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return "";

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad -= 1;
  }

  return edad >= 0 ? edad : "";
}

function formatearFecha(fecha) {
  if (!fecha) return "Sin registro";

  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function renderizarDiagnosticos(datos) {
  const diagnosticoDiv = document.getElementById("diagnostico");

  if (!diagnosticoDiv) return;

  diagnosticoDiv.innerHTML = "";

  const historial = Array.isArray(datos.historialDiagnosticos)
    ? datos.historialDiagnosticos
    : [];

  const principal = datos.diagnostico || historial[historial.length - 1] || "";
  const clavePrincipal = claveDiagnostico(principal);

  if (historial.length === 0) {
    const linea = document.createElement("div");
    linea.className = "diagnostico-linea principal";
    linea.textContent = formatearDiagnostico(principal);
    diagnosticoDiv.appendChild(linea);
    return;
  }

  historial.forEach((dx, index) => {
    const esPrincipal = claveDiagnostico(dx) === clavePrincipal;
    const linea = document.createElement("div");
    linea.className = `diagnostico-linea${esPrincipal ? " principal" : ""}`;

    const texto = document.createElement("span");
    texto.textContent = formatearDiagnostico(dx);

    const acciones = document.createElement("div");
    acciones.className = "diagnostico-acciones";

    if (esPrincipal) {
      const etiqueta = document.createElement("span");
      etiqueta.className = "diagnostico-principal-badge";
      etiqueta.textContent = "Principal";
      acciones.appendChild(etiqueta);
    } else {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "boton-diagnostico-principal";
      boton.textContent = "Marcar principal";
      boton.addEventListener("click", () => window.marcarDiagnosticoPrincipal(index));
      acciones.appendChild(boton);
    }

    linea.append(texto, acciones);
    diagnosticoDiv.appendChild(linea);
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const parametros = new URLSearchParams(window.location.search);
  uidPaciente = parametros.get("id");

  await cargarDatosPaciente();
});

async function cargarDatosPaciente() {
  const datos = await obtenerUsuario(uidPaciente);
  datosPacienteActual = datos;

  if (!datos) {
    document.getElementById("nombrePaciente").innerText =
      "Paciente no encontrado";
    return;
  }

  document.getElementById("nombrePaciente").innerText =
    datos.nombre || "Paciente sin nombre";

  document.getElementById("correoPaciente").innerText =
    datos.email || "Sin correo";

  const edadCalculada = calcularEdad(datos.fechaNacimiento);

  document.getElementById("fechaNacimientoPaciente").innerText =
    formatearFecha(datos.fechaNacimiento);

  document.getElementById("edadPaciente").innerText =
    edadCalculada || datos.edad
      ? `${edadCalculada || datos.edad} años`
      : "No registrada";

  renderizarDiagnosticos(datos);

  document.getElementById("tratamiento").innerText =
    datos.tratamiento || "Sin tratamiento registrado";

  document.getElementById("medicoTratante").innerText =
    datos.medicoTratante || "Sin médico tratante";

  document.getElementById("ultimaConsulta").innerText =
    datos.ultimaConsulta || "Sin fecha";

  document.getElementById("proximaConsulta").textContent =
    datos.proximaConsulta || "Sin programar";

  document.getElementById("telefonoPaciente").innerText =
    datos.telefono || "Sin teléfono";
}

window.mostrarResumen = function() {
  document.getElementById("seccionResumen").style.display = "block";
  document.getElementById("seccionPermisos").style.display = "none";
};

window.mostrarPermisos = async function() {
  document.getElementById("seccionResumen").style.display = "none";
  document.getElementById("seccionPermisos").style.display = "block";

  await cargarPermisosMedicos();
};

async function cargarPermisosMedicos() {
  const contenedor = document.getElementById("listaPermisosMedicos");
  contenedor.innerHTML = "Cargando permisos...";

  const permisos = await listarPermisosMedicos(uidPaciente);

  if (permisos.length === 0) {
    contenedor.innerHTML = `
      <p>No hay médicos con permisos registrados.</p>
    `;
    return;
  }

  contenedor.innerHTML = "";

  for (const permiso of permisos) {
    const medico = await obtenerUsuario(permiso.uid);

    const nombreMedico =
      medico?.nombre ||
      medico?.email ||
      permiso.uid;

    const rolActual = permiso.rolPermiso || "estudiante";

    contenedor.innerHTML += `
      <div class="dato" style="margin-bottom:16px;">
        <strong>${nombreMedico}</strong>
        <br>
        <span>Rol actual: ${rolActual}</span>
        <br><br>

        <select id="rol-${permiso.uid}">
          <option value="tratante" ${rolActual === "tratante" ? "selected" : ""}>Tratante</option>
          <option value="colaborador" ${rolActual === "colaborador" ? "selected" : ""}>Colaborador</option>
          <option value="estudiante" ${rolActual === "estudiante" ? "selected" : ""}>Estudiante</option>
        </select>

        <button onclick="cambiarRolPermiso('${permiso.uid}')">
          Cambiar rol
        </button>

        <button style="background:#8b0000; color:white;" onclick="revocarPermiso('${permiso.uid}')">
          Revocar
        </button>
      </div>
    `;
  }
}

window.agregarPermisoMedico = async function() {
  const correo = document
    .getElementById("correoMedicoPermiso")
    .value
    .trim()
    .toLowerCase();

  const rol = document.getElementById("rolPermisoMedico").value;

  if (!correo) {
    alert("Escribe el correo del médico.");
    return;
  }

  const medico = await buscarMedicoPorCorreo(correo);

  if (!medico) {
    alert("No se encontró un médico registrado con ese correo.");
    return;
  }

  await otorgarPermisoMedico(
    uidPaciente,
    medico.uid,
    rol,
    auth.currentUser.uid
  );

  alert("Permiso otorgado correctamente.");

  document.getElementById("correoMedicoPermiso").value = "";

  await cargarPermisosMedicos();
};

window.cambiarRolPermiso = async function(uidMedico) {
  const nuevoRol = document.getElementById(`rol-${uidMedico}`).value;

  await cambiarRolPermisoMedico(
    uidPaciente,
    uidMedico,
    nuevoRol,
    auth.currentUser.uid
  );

  alert("Rol actualizado.");

  await cargarPermisosMedicos();
};

window.revocarPermiso = async function(uidMedico) {
  const confirmar = confirm("¿Seguro que deseas revocar el acceso de este médico?");

  if (!confirmar) return;

  await revocarPermisoMedico(uidPaciente, uidMedico);

  alert("Permiso revocado.");

  await cargarPermisosMedicos();
};

window.editarNombrePaciente = async function() {
  const nuevoNombre = prompt("Nuevo nombre:");

  if (!nuevoNombre) return;

  await actualizarUsuario(uidPaciente, {
    nombre: nuevoNombre
  });

  await cargarDatosPaciente();

  alert("Nombre actualizado");
};

window.editarDatosPaciente = async function() {
  const datos = await obtenerUsuario(uidPaciente);

  const nuevoTelefono = prompt("Teléfono:", datos.telefono || "");
  if (nuevoTelefono === null) return;

  const nuevaFechaNacimiento = prompt(
    "Fecha de nacimiento (AAAA-MM-DD):",
    datos.fechaNacimiento || ""
  );
  if (nuevaFechaNacimiento === null) return;

  const nuevaEdad = prompt(
    "Edad manual (opcional, se usa si no hay fecha de nacimiento):",
    datos.edad || ""
  );
  if (nuevaEdad === null) return;

  const nuevoDiagnostico = prompt("Diagnóstico:", datos.diagnostico || "");
  if (nuevoDiagnostico === null) return;

  const nuevoTratamiento = prompt("Tratamiento:", datos.tratamiento || "");
  if (nuevoTratamiento === null) return;

  const nuevoMedico = prompt("Médico tratante:", datos.medicoTratante || "");
  if (nuevoMedico === null) return;

  const nuevaConsulta = prompt("Última consulta:", datos.ultimaConsulta || "");
  if (nuevaConsulta === null) return;

  await actualizarUsuario(uidPaciente, {
    telefono: nuevoTelefono,
    fechaNacimiento: nuevaFechaNacimiento,
    edad: nuevaEdad,
    diagnostico: nuevoDiagnostico,
    tratamiento: nuevoTratamiento,
    medicoTratante: nuevoMedico,
    ultimaConsulta: nuevaConsulta
  });

  await cargarDatosPaciente();

  alert("Datos actualizados");
};

window.editarCampoPaciente = async function(campo, etiqueta, tipo = "text") {
  const datos = datosPacienteActual || await obtenerUsuario(uidPaciente);
  const valorActual = datos?.[campo] || "";
  const etiquetaCampo = etiqueta || campo;
  let nuevoValor = null;

  if (tipo === "textarea") {
    nuevoValor = prompt(`${etiquetaCampo}:`, valorActual);
  } else if (tipo === "date") {
    nuevoValor = prompt(`${etiquetaCampo} (AAAA-MM-DD):`, valorActual);
  } else if (tipo === "number") {
    nuevoValor = prompt(`${etiquetaCampo}:`, valorActual);
  } else {
    nuevoValor = prompt(`${etiquetaCampo}:`, valorActual);
  }

  if (nuevoValor === null) return;

  const actualizacion = {
    [campo]: nuevoValor
  };

  if (campo === "fechaNacimiento") {
    const edadCalculada = calcularEdad(nuevoValor);
    actualizacion.edad = edadCalculada || datos?.edad || "";
  }

  await actualizarUsuario(uidPaciente, actualizacion);
  await cargarDatosPaciente();
};

window.marcarDiagnosticoPrincipal = async function(index) {
  const datos = await obtenerUsuario(uidPaciente);
  const historial = Array.isArray(datos?.historialDiagnosticos)
    ? datos.historialDiagnosticos
    : [];

  const diagnostico = historial[index];

  if (!diagnostico) {
    alert("No se encontro el diagnostico seleccionado.");
    return;
  }

  await actualizarUsuario(uidPaciente, {
    diagnostico
  });

  await cargarDatosPaciente();
};

window.abrirNota = function() {
  window.location.href = "nota.html?id=" + uidPaciente;
};

window.solicitarEliminarPaciente = async function() {
  const confirmar = confirm(
    "¿Deseas suspender este paciente y solicitar eliminación al administrador?"
  );

  if (!confirmar) return;

  try {
    await solicitarEliminacionPaciente(
      uidPaciente,
      auth.currentUser.uid
    );

    alert("Paciente suspendido. Eliminación pendiente de autorización.");

    window.location.href = "medico.html";
  } catch (error) {
    alert(error.message);
  }
};

window.abrirHistoriaClinica = function() {
  if (!uidPaciente) {
    alert("No se encontró el ID del paciente.");
    return;
  }

  window.location.href = `historia.html?id=${uidPaciente}`;
};
