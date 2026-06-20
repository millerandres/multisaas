const firebaseConfig = {
  apiKey: "AIzaSyAoGfiMxgkGp1Gu-HojMyAMkHGbluYog4U",
  authDomain: "agenciaweb555.firebaseapp.com",
  databaseURL: "https://agenciaweb555-default-rtdb.firebaseio.com",
  projectId: "agenciaweb555",
  storageBucket: "agenciaweb555.firebasestorage.app",
  messagingSenderId: "661332949880",
  appId: "1:661332949880:web:6d779e634f2ee1543a268d"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ✅ Inicializar servicios
const db = firebase.database();
const storage = firebase.storage();
const auth = firebase.auth();

// Exportar globalmente
window.db = db;
window.storage = storage;
window.auth = auth;

// ✅ NEGOCIO_ID se obtiene dinámicamente de la URL o config
window.NEGOCIO_ID = "heladeria-emilia"; // Este valor cambia según el negocio

console.log('✅ Firebase inicializado - Multi-SaaS ready');