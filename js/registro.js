import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btnCrearCuenta = document.getElementById("btnCrearCuenta");

btnCrearCuenta.addEventListener("click", async () => {
  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const mensaje = document.getElementById("mensaje");

  if (!nombre || !email || !password) {
    mensaje.textContent = "Completa todos los campos.";
    return;
  }

  if (password.length < 6) {
    mensaje.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  try {
    mensaje.textContent = "Creando cuenta...";

    const credencial = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = credencial.user.uid;

    await setDoc(doc(db, "usuarios", uid), {
      nombre,
      email,
      rol: "paciente",
      tieneCuenta: true,
      estado: "activo",
      fechaCreacion: new Date().toISOString()
    });

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