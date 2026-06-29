import { auth } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  obtenerUsuario,
  crearPacienteProvisional
} from "./services/usuarios.js";

let uidMedico = "";

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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  uidMedico = user.uid;

  const usuario = await obtenerUsuario(user.uid);

  if (!usuario || usuario.rol !== "medico") {
    alert("Acceso restringido al personal médico");
    window.location.href = "dashboard.html";
  }
});

window.guardarPacienteNuevo = async function() {
  const fechaNacimiento = document.getElementById("fechaNacimiento").value;

  const paciente = {
    nombre: document.getElementById("nombre").value,
    fechaNacimiento,
    edad: calcularEdad(fechaNacimiento),
    sexo: document.getElementById("sexo").value,
    curp: document.getElementById("curp").value,
    telefono: document.getElementById("telefono").value,
    email: document.getElementById("email").value,
    estadoCivil: document.getElementById("estadoCivil").value,
    escolaridad: document.getElementById("escolaridad").value,
    ocupacion: document.getElementById("ocupacion").value,
    medicoTratante: document.getElementById("medicoTratante").value,
    diagnostico: document.getElementById("diagnostico").value,
    ultimaConsulta: document.getElementById("ultimaConsulta").value,
    tratamiento: document.getElementById("tratamiento").value,
    observaciones: document.getElementById("observaciones").value,
    
    creadoPor: uidMedico,
    medicoTratanteUid: uidMedico,
    medicosAutorizados: [uidMedico]
  };

  if (!paciente.nombre) {
    alert("Escribe el nombre del paciente");
    return;
  }

  try {
    await crearPacienteProvisional(paciente);

    alert("Paciente creado correctamente");
    window.location.href = "medico.html";

  } catch(error) {
    alert("Error: " + error.message);
  }
};
