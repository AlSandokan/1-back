import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.registrarUsuario = async function() {
  const nombre = document.getElementById("nombre").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "usuarios", cred.user.uid), {
      nombre: nombre,
      email: email,
      rol: "paciente",
      fechaRegistro: new Date().toISOString()
    });

    alert("Usuario creado correctamente");
    window.location.href = "dashboard.html";

  } catch(error) {
    alert(error.message);
  }
};

window.iniciarSesion = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "dashboard.html";

  } catch(error) {
    alert(error.message);
  }
};

window.cerrarSesion = async function() {
  await signOut(auth);
  window.location.href = "login.html";
};
