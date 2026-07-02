let reconocimiento = null;
let dictadoActivo = false;
let textoBaseDictado = "";

function obtenerSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function obtenerElemento(id) {
  return document.getElementById(id);
}

function actualizarEstadoDictado(mensaje, estado = "") {
  const estadoEl = obtenerElemento("estadoDictadoClinico");
  if (!estadoEl) return;

  estadoEl.textContent = mensaje;
  estadoEl.dataset.estado = estado;
}

function unirTextoClinico(textoActual = "", textoNuevo = "") {
  const actual = textoActual.trim();
  const nuevo = textoNuevo.trim();

  if (!actual) return nuevo;
  if (!nuevo) return actual;

  return `${actual}\n\n${nuevo}`;
}

function normalizarFragmentoDictado(fragmento = "") {
  return String(fragmento || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function navegadorSoportaDictado() {
  return Boolean(obtenerSpeechRecognition());
}

export function iniciarDictado() {
  const textarea = obtenerElemento("textoDictadoClinico");

  if (!navegadorSoportaDictado()) {
    actualizarEstadoDictado("Dictado no disponible en este navegador", "no-disponible");
    alert("Tu navegador no soporta dictado por voz.");
    return;
  }

  if (!textarea) return;

  if (!reconocimiento) {
    const SpeechRecognition = obtenerSpeechRecognition();
    reconocimiento = new SpeechRecognition();
    reconocimiento.lang = "es-MX";
    reconocimiento.continuous = true;
    reconocimiento.interimResults = true;

    reconocimiento.onresult = (evento) => {
      let textoFinal = "";
      let textoInterino = "";

      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const fragmento = normalizarFragmentoDictado(evento.results[i][0]?.transcript || "");
        if (!fragmento) continue;

        if (evento.results[i].isFinal) {
          textoFinal = unirTextoClinico(textoFinal, fragmento);
        } else {
          textoInterino = unirTextoClinico(textoInterino, fragmento);
        }
      }

      if (textoFinal) {
        textoBaseDictado = unirTextoClinico(textoBaseDictado || textarea.value, textoFinal);
      }

      textarea.value = unirTextoClinico(textoBaseDictado, textoInterino);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    };

    reconocimiento.onerror = () => {
      actualizarEstadoDictado("Dictado detenido", "detenido");
      dictadoActivo = false;
    };

    reconocimiento.onend = () => {
      if (dictadoActivo) {
        try {
          reconocimiento.start();
        } catch (error) {
          dictadoActivo = false;
          actualizarEstadoDictado("Dictado detenido", "detenido");
        }
      } else {
        actualizarEstadoDictado("Dictado pausado", "pausado");
      }
    };
  }

  textoBaseDictado = textarea.value;
  dictadoActivo = true;
  actualizarEstadoDictado("Escuchando...", "escuchando");

  try {
    reconocimiento.start();
  } catch (error) {
    actualizarEstadoDictado("Escuchando...", "escuchando");
  }
}

export function pausarDictado() {
  dictadoActivo = false;

  if (reconocimiento) {
    try {
      reconocimiento.stop();
    } catch (error) {
      // El navegador puede lanzar error si ya estaba detenido.
    }
  }

  textoBaseDictado = obtenerElemento("textoDictadoClinico")?.value || "";
  actualizarEstadoDictado("Dictado pausado", "pausado");
}

export function limpiarDictado() {
  const textarea = obtenerElemento("textoDictadoClinico");
  if (!textarea) return;

  textarea.value = "";
  textoBaseDictado = "";
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  actualizarEstadoDictado(dictadoActivo ? "Escuchando..." : "Dictado detenido", dictadoActivo ? "escuchando" : "detenido");
}

function obtenerCampoDestinoNota() {
  const esNotaRapida = obtenerElemento("tipoNota")?.value === "rapida";
  const candidatos = esNotaRapida
    ? ["notaRapida", "subjetivo", "analisis"]
    : ["subjetivo", "notaRapida", "analisis"];

  return candidatos
    .map((id) => obtenerElemento(id))
    .find(Boolean) || null;
}

export function insertarDictadoEnNota() {
  const textarea = obtenerElemento("textoDictadoClinico");
  const destino = obtenerCampoDestinoNota();
  const texto = textarea?.value.trim() || "";

  if (!texto) {
    alert("No hay texto dictado para insertar.");
    return;
  }

  if (!destino) {
    alert("No se encontro el campo de nota clinica para insertar el dictado.");
    return;
  }

  const confirmado = confirm("Revise y corrija el dictado antes de integrarlo al expediente clinico.");
  if (!confirmado) return;

  destino.value = unirTextoClinico(destino.value, texto);
  destino.dispatchEvent(new Event("input", { bubbles: true }));
  destino.focus();
}

export function inicializarDictadoClinico() {
  const iniciar = obtenerElemento("btnIniciarDictado");
  const pausar = obtenerElemento("btnPausarDictado");
  const limpiar = obtenerElemento("btnLimpiarDictado");
  const insertar = obtenerElemento("btnInsertarDictado");

  if (!iniciar || !pausar || !limpiar || !insertar) return;

  iniciar.addEventListener("click", iniciarDictado);
  pausar.addEventListener("click", pausarDictado);
  limpiar.addEventListener("click", limpiarDictado);
  insertar.addEventListener("click", insertarDictadoEnNota);

  if (!navegadorSoportaDictado()) {
    actualizarEstadoDictado("Dictado no disponible en este navegador", "no-disponible");
    iniciar.disabled = true;
    pausar.disabled = true;
    return;
  }

  actualizarEstadoDictado("Dictado detenido", "detenido");
}

window.inicializarDictadoClinico = inicializarDictadoClinico;
window.iniciarDictado = iniciarDictado;
window.pausarDictado = pausarDictado;
window.limpiarDictado = limpiarDictado;
window.insertarDictadoEnNota = insertarDictadoEnNota;
window.navegadorSoportaDictado = navegadorSoportaDictado;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarDictadoClinico);
} else {
  inicializarDictadoClinico();
}
