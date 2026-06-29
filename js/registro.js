import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btnCrearCuenta = document.getElementById("btnCrearCuenta");

btnCrearCuenta.addEventListener("click", async () => {
  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const correoMedico = document.getElementById("correoMedico").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const mensaje = document.getElementById("mensaje");

  if (!nombre || !email || !correoMedico || !password) {
    mensaje.textContent = "Completa todos los campos.";
    return;
  }

  if (password.length < 6) {
    mensaje.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  try {
    mensaje.textContent = "Buscando médico tratante...";

    const qMedico = query(
      collection(db, "usuarios"),
      where("email", "==", correoMedico),
      where("rol", "==", "medico")
    );

    const snapMedico = await getDocs(qMedico);

    if (snapMedico.empty) {
      mensaje.textContent = "No se encontró un médico registrado con ese correo.";
      return;
    }

    const docMedico = snapMedico.docs[0];
    const uidMedico = docMedico.id;
    const datosMedico = docMedico.data();

    mensaje.textContent = "Creando cuenta...";

    const credencial = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uidPaciente = credencial.user.uid;

    await setDoc(doc(db, "usuarios", uidPaciente), {
      nombre,
      email,
      rol: "paciente",
      tieneCuenta: true,
      estado: "activo",

      creadoPor: uidMedico,
      medicoTratanteUid: uidMedico,
      medicoTratante: datosMedico.nombre || correoMedico,

      fechaCreacion: new Date().toISOString()
    });

    await setDoc(
      doc(db, "usuarios", uidPaciente, "permisosMedicos", uidMedico),
      {
        lectura: true,
        agregarNotas: true,
        editarPaciente: true,
        administrarPermisos: true,
        rolPermiso: "tratante",
        fechaOtorgamiento: new Date().toISOString(),
        otorgadoPor: uidPaciente
      }
    );

    mensaje.textContent = "Cuenta creada correctamente.";
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      mensaje.textContent = "Ese correo ya está registrado.";
    } else if (error.code === "auth/invalid-email") {
      mensaje.textContent = "Correo inválido.";
    } else if (error.code === "auth/weak-password") {
      mensaje.textContent = "Contraseña demasiado débil.";
    } else {
      mensaje.textContent = "Error al crear la cuenta.";
    }
  }
});