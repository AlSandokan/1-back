import { auth } from "./firebase.js";
import { CIE10 } from "./data/cie10.js";
import { CIE11 } from "./data/cie11.js";
import { MEDICAMENTOS } from "./data/medicamentos.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  obtenerUsuario,
  listarPacientes,
  actualizarUsuario
} from "./services/usuarios.js";

import {
  guardarNota,
  obtenerHistorialNotas
} from "./services/notas.js";

let uidPacienteActual = null;
let diagnosticosSeleccionados = [];

const buscadorDiagnostico = document.getElementById("buscadorDiagnostico");
const resultadosCIE10 = document.getElementById("resultadosCIE10");
const cie10Codigo = document.getElementById("cie10Codigo");
const cie10Nombre = document.getElementById("cie10Nombre");
const buscadorCIE10 = document.getElementById("buscadorCIE10");
const buscadorCIE11 = document.getElementById("buscadorCIE11");
const resultadosCIE10Lista = document.getElementById("resultadosCIE10Lista");
const resultadosCIE11Lista = document.getElementById("resultadosCIE11Lista");
const diagnosticoCatalogoVisible = document.getElementById("diagnosticoCatalogoVisible");
const catalogoDiagnosticos = [
  ...CIE10.map((dx) => ({ ...dx, catalogo: "CIE-10" })),
  ...CIE11.map((dx) => ({ ...dx, catalogo: "CIE-11" }))
];

function configurarBuscadorCatalogo(input, contenedor, catalogo, nombreCatalogo) {
  if (!input || !contenedor) return;

  input.addEventListener("input", () => {
    const texto = input.value.toLowerCase().trim();
    contenedor.innerHTML = "";

    if (texto.length < 2) return;

    catalogo
      .filter((dx) =>
        dx.codigo.toLowerCase().includes(texto) ||
        dx.nombre.toLowerCase().includes(texto)
      )
      .slice(0, 10)
      .forEach((dx) => {
        const item = document.createElement("div");
        item.classList.add("resultado-cie10");
        item.innerHTML = `<strong>${dx.codigo}</strong> <span>${nombreCatalogo}</span> - ${dx.nombre}`;
        item.addEventListener("click", () => {
          agregarDiagnostico({ ...dx, catalogo: nombreCatalogo });
          input.value = "";
          contenedor.innerHTML = "";
        });
        contenedor.appendChild(item);
      });
  });
}

configurarBuscadorCatalogo(buscadorCIE10, resultadosCIE10Lista, CIE10, "CIE-10");
configurarBuscadorCatalogo(buscadorCIE11, resultadosCIE11Lista, CIE11, "CIE-11");

if (buscadorDiagnostico && resultadosCIE10 && cie10Codigo && cie10Nombre) {
  buscadorDiagnostico.addEventListener("input", () => {
    const texto = buscadorDiagnostico.value.toLowerCase().trim();

    resultadosCIE10.innerHTML = "";

    if (texto.length < 2) return;

    const resultados = catalogoDiagnosticos.filter((dx) => {
      return (
        dx.codigo.toLowerCase().includes(texto) ||
        dx.nombre.toLowerCase().includes(texto)
      );
    }).slice(0, 10);

    resultados.forEach((dx) => {
      const item = document.createElement("div");
      item.classList.add("resultado-cie10");

      item.innerHTML = `
        <strong>${dx.codigo}</strong> <span>${dx.catalogo}</span> - ${dx.nombre}
      `;

      item.addEventListener("click", () => {
        agregarDiagnostico(dx);
        buscadorDiagnostico.value = "";
        resultadosCIE10.innerHTML = "";
      });

      resultadosCIE10.appendChild(item);
    });
  });
}

const buscadorMedicamento = document.getElementById("buscadorMedicamento");
const resultadosMedicamentos = document.getElementById("resultadosMedicamentos");

if (buscadorMedicamento && resultadosMedicamentos) {
  buscadorMedicamento.addEventListener("input", () => {
    const texto = buscadorMedicamento.value.toLowerCase().trim();
    resultadosMedicamentos.innerHTML = "";

    if (texto.length < 2) return;

    MEDICAMENTOS.filter((med) =>
      med.nombre.toLowerCase().includes(texto) ||
      med.clase.toLowerCase().includes(texto)
    ).slice(0, 10).forEach((med) => {
      const item = document.createElement("div");
      item.className = "resultado-cie10";
      item.innerHTML = `<strong>${med.nombre}</strong> - ${med.clase}<br><small>${med.dosisHabitual} | ${med.notas}</small>`;
      item.addEventListener("click", () => {
        const tratamiento = document.getElementById("tratamiento");
        const textoMed = `${med.nombre} (${med.clase}) - ${med.dosisHabitual}. ${med.notas}`;
        tratamiento.value = tratamiento.value
          ? `${tratamiento.value}\n${textoMed}`
          : textoMed;
        buscadorMedicamento.value = "";
        resultadosMedicamentos.innerHTML = "";
      });
      resultadosMedicamentos.appendChild(item);
    });
  });
}

function agregarDiagnostico(dx) {
  const yaExiste = diagnosticosSeleccionados.some(
    (item) =>
      item.codigo === dx.codigo &&
      (item.catalogo || "CIE-10") === (dx.catalogo || "CIE-10")
  );

  if (yaExiste) {
    alert("Este diagnóstico ya está seleccionado");
    return;
  }

  const nuevoDiagnostico = {
    codigo: dx.codigo,
    nombre: dx.nombre,
    catalogo: dx.catalogo || "CIE-10",
    texto: `${dx.codigo} - ${dx.nombre}`,
    fechaSeleccion: new Date().toISOString()
  };

  diagnosticosSeleccionados.push(nuevoDiagnostico);

  cie10Codigo.value = dx.codigo;
  cie10Nombre.value = dx.nombre;

  renderizarDiagnosticosSeleccionados();
}

function renderizarDiagnosticosSeleccionados() {
  const contenedor = document.getElementById("diagnosticosSeleccionados");

  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (diagnosticosSeleccionados.length === 0) {
    contenedor.innerHTML = `
      <p style="color:#999;">No hay diagnósticos seleccionados</p>
    `;
    return;
  }

  ["CIE-10", "CIE-11"].forEach((catalogo) => {
    const diagnosticos = diagnosticosSeleccionados
      .map((dx, index) => ({ ...dx, index }))
      .filter((dx) => (dx.catalogo || "CIE-10") === catalogo);

    if (diagnosticos.length === 0) return;

    contenedor.innerHTML += `<h4 class="diagnostico-catalogo-titulo">${catalogo}</h4>`;

    diagnosticos.forEach((dx) => {
      contenedor.innerHTML += `
        <div class="diagnostico-item">
          <span>${dx.texto}</span>

          <button type="button" onclick="eliminarDiagnostico(${dx.index})">
            Eliminar diagnóstico
          </button>
        </div>
      `;
    });
  });
}

window.eliminarDiagnostico = function(index) {
  const confirmar = confirm("¿Eliminar diagnóstico?");

  if (!confirmar) return;

  diagnosticosSeleccionados.splice(index, 1);

  renderizarDiagnosticosSeleccionados();
};

function diagnosticoActual() {
  if (diagnosticosSeleccionados.length === 0) return null;

  const catalogoVisible = diagnosticoCatalogoVisible?.value || "auto";

  if (catalogoVisible !== "auto") {
    const diagnostico = [...diagnosticosSeleccionados]
      .reverse()
      .find((dx) => (dx.catalogo || "CIE-10") === catalogoVisible);

    if (diagnostico) return diagnostico;
  }

  return diagnosticosSeleccionados[diagnosticosSeleccionados.length - 1];
}

function textoDiagnosticos() {
  if (diagnosticosSeleccionados.length === 0) return "";

  return diagnosticosSeleccionados
    .map((dx) => dx.texto)
    .join("\n");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const usuario = await obtenerUsuario(user.uid);

  if (!usuario || usuario.rol !== "medico") {
    alert("Acceso restringido al personal médico");
    window.location.href = "dashboard.html";
    return;
  }

  const parametros = new URLSearchParams(window.location.search);
  uidPacienteActual = parametros.get("id");

  if (uidPacienteActual) {
    const bloqueSelector = document.getElementById("bloqueSelectorPaciente");

    if (bloqueSelector) {
      bloqueSelector.style.display = "none";
    }

    await cargarPaciente(uidPacienteActual);
    await cargarHistorial(uidPacienteActual);
  } else {
    await cargarListaPacientes();
  }
});

async function cargarListaPacientes() {
  const selector = document.getElementById("uidPaciente");

  if (!selector) return;

  const pacientes = await listarPacientes();

  pacientes.forEach((paciente) => {
    const datos = paciente.data();
    const opcion = document.createElement("option");

    opcion.value = paciente.id;
    opcion.textContent = datos.nombre || "Sin nombre";

    selector.appendChild(opcion);
  });

  selector.addEventListener("change", async () => {
    uidPacienteActual = selector.value;

    await cargarPaciente(uidPacienteActual);
    await cargarHistorial(uidPacienteActual);
  });
}

async function cargarPaciente(uidPaciente) {
  const datos = await obtenerUsuario(uidPaciente);

  if (!datos) return;

  const tratamiento = document.getElementById("tratamiento");
  const medico = document.getElementById("medico");
  const ultimaConsulta = document.getElementById("ultimaConsulta");
  const proximaConsulta = document.getElementById("proximaConsulta");

  diagnosticosSeleccionados = [];

  if (Array.isArray(datos.historialDiagnosticos)) {
    diagnosticosSeleccionados = datos.historialDiagnosticos;
  } else if (typeof datos.diagnostico === "object" && datos.diagnostico !== null) {
    diagnosticosSeleccionados = [datos.diagnostico];
  } else if (typeof datos.diagnostico === "string" && datos.diagnostico.trim() !== "") {
    diagnosticosSeleccionados = [
      {
        codigo: "",
        nombre: datos.diagnostico,
        texto: datos.diagnostico,
        fechaSeleccion: new Date().toISOString()
      }
    ];
  }

  renderizarDiagnosticosSeleccionados();

  const dxActual = diagnosticoActual();

  if (buscadorDiagnostico) {
    buscadorDiagnostico.value = dxActual?.texto || "";
  }

  if (cie10Codigo) {
    cie10Codigo.value = dxActual?.codigo || "";
  }

  if (cie10Nombre) {
    cie10Nombre.value = dxActual?.nombre || "";
  }

  if (tratamiento) tratamiento.value = datos.tratamiento || "";
  if (medico) medico.value = datos.medicoTratante || "";
  if (ultimaConsulta) ultimaConsulta.value = datos.ultimaConsulta || "";
  if (proximaConsulta) proximaConsulta.value = datos.proximaConsulta || "";
  if (diagnosticoCatalogoVisible) {
    diagnosticoCatalogoVisible.value = datos.diagnosticoCatalogoVisible || "auto";
  }
}

window.guardarNotaMedica = async function() {
  const selector = document.getElementById("uidPaciente");
  const uidPaciente = uidPacienteActual || selector?.value;

  if (!uidPaciente) {
    alert("Selecciona un paciente");
    return;
  }

  const diagnostico = diagnosticoActual();

  const tratamiento = document.getElementById("tratamiento").value;
  const medico = document.getElementById("medico").value;
  const ultimaConsulta = document.getElementById("ultimaConsulta").value;
  const proximaConsulta = document.getElementById("proximaConsulta").value;

  const subjetivo = document.getElementById("subjetivo").value;
  const objetivo = document.getElementById("objetivo").value;
  const analisis = document.getElementById("analisis").value;
  const plan = document.getElementById("plan").value;
  const catalogoVisible = diagnosticoCatalogoVisible?.value || "auto";

  try {
    await actualizarUsuario(uidPaciente, {
      diagnostico,
      diagnosticoCatalogoVisible: catalogoVisible,
      diagnosticos: diagnosticosSeleccionados,
      historialDiagnosticos: diagnosticosSeleccionados,
      tratamiento,
      medicoTratante: medico,
      ultimaConsulta,
      proximaConsulta
    });

    await guardarNota(uidPaciente, {
      autor: medico,
      subjetivo,
      objetivo,
      analisis,
      plan,
      diagnostico,
      diagnosticoCatalogoVisible: catalogoVisible,
      diagnosticos: diagnosticosSeleccionados,
      historialDiagnosticos: diagnosticosSeleccionados,
      tratamiento,
      ultimaConsulta,
      proximaConsulta
    });

    alert("Nota médica guardada correctamente");

    await cargarHistorial(uidPaciente);

  } catch(error) {
    alert("Error: " + error.message);
  }
};

async function cargarHistorial(uidPaciente) {
  const contenedor = document.getElementById("historialNotas");

  if (!contenedor) return;

  contenedor.innerHTML = "";

  const notas = await obtenerHistorialNotas(uidPaciente);

  if (notas.empty) {
    contenedor.innerHTML = `
      <p style="color:#999">
        No hay notas registradas
      </p>
    `;
    return;
  }

  notas.forEach((nota) => {
    const datos = nota.data();

    const fecha = new Date(datos.fecha);

    const fechaTexto = fecha.toLocaleDateString("es-MX");

    const horaTexto = fecha.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit"
    });

    let diagnosticosTexto = "";

    if (Array.isArray(datos.historialDiagnosticos)) {
      diagnosticosTexto = datos.historialDiagnosticos
        .map((dx) => dx.texto || "")
        .join("<br>");
    } else if (typeof datos.diagnostico === "object" && datos.diagnostico !== null) {
      diagnosticosTexto = datos.diagnostico.texto || "";
    } else {
      diagnosticosTexto = datos.diagnostico || "";
    }

    contenedor.innerHTML += `
      <details style="
        background:#0d0d0d;
        border:1px solid #333;
        border-radius:20px;
        padding:22px;
        margin-bottom:20px;
      ">

        <summary style="
          cursor:pointer;
          font-size:18px;
          font-weight:bold;
          outline:none;
        ">
          ${fechaTexto} · ${horaTexto} · ${datos.autor || "Sin médico"}
        </summary>

        <div style="margin-top:20px;">

          <p><b>Diagnósticos:</b><br>
            ${diagnosticosTexto}
          </p>

          <p><b>Subjetivo:</b><br>${datos.subjetivo || ""}</p>

          <p><b>Objetivo:</b><br>${datos.objetivo || ""}</p>

          <p><b>Análisis:</b><br>${datos.analisis || ""}</p>

          <p><b>Plan:</b><br>${datos.plan || ""}</p>

        </div>

      </details>
    `;
  });
}

window.regresarDesdeNota = function() {
  if (uidPacienteActual) {
    window.location.href = `paciente.html?id=${uidPacienteActual}`;
  } else {
    window.location.href = "medico.html";
  }
};

window.generarPDFNota = function() {
  window.print();
};
