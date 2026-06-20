// config_admin.js - Configuración Firebase para Panel Admin (Multi-SaaS)
// Compatible con Firebase SDK v10.8.0 Compat

// === CONFIGURACIÓN FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyAoGfiMxgkGp1Gu-HojMyAMkHGbluYog4U",
  authDomain: "agenciaweb555.firebaseapp.com",
  databaseURL: "https://agenciaweb555-default-rtdb.firebaseio.com",
  projectId: "agenciaweb555",
  storageBucket: "agenciaweb555.firebasestorage.app",
  messagingSenderId: "661332949880",
  appId: "1:661332949880:web:6d779e634f2ee1543a268d"
};

// === VERIFICAR QUE FIREBASE ESTÉ DISPONIBLE ===
if (typeof firebase === 'undefined') {
  console.error('❌ Firebase SDK no está cargado. Verifica el orden de los scripts.');
}

// === INICIALIZAR FIREBASE (solo si no está inicializado) ===
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase inicializado');
} else if (typeof firebase !== 'undefined') {
  console.log('ℹ️ Firebase ya estaba inicializado');
}

// === EXPORTAR SERVICIOS GLOBALES (CON MANEJO DE ERRORES) ===
if (typeof firebase !== 'undefined') {
  window.db = firebase.database();
  window.auth = firebase.auth();
  
  // Storage opcional con try/catch
  try {
    if (typeof firebase.storage === 'function') {
      window.storage = firebase.storage();
    }
  } catch (e) {
    console.warn('⚠️ Firebase Storage no disponible:', e.message);
    window.storage = null;
  }
} else {
  console.error('❌ No se pueden exportar servicios: Firebase no está disponible');
  window.db = null;
  window.auth = null;
  window.storage = null;
}

// === DETECTAR NEGOCIO ACTUAL (Multi-SaaS) ===
function getNegocioId() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const negocioFromUrl = urlParams.get('negocio');
    
    if (negocioFromUrl) {
      console.log('🎯 Negocio desde URL:', negocioFromUrl);
      return negocioFromUrl;
    }
    
    if (window.NEGOCIO_ID) {
      console.log('🎯 Negocio desde window.NEGOCIO_ID:', window.NEGOCIO_ID);
      return window.NEGOCIO_ID;
    }
  } catch (e) {
    console.warn('⚠️ Error al obtener negocio de URL:', e);
  }
  
  const defaultNegocio = "Restaurante-Jireth";
  console.log('⚠️ Usando negocio por defecto:', defaultNegocio);
  return defaultNegocio;
}

window.NEGOCIO_ID = getNegocioId();

// === UTILIDADES GLOBALES ===

window.formatearPrecio = function(num) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num || 0);
};

window.formatearFecha = function(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

window.formatDateForInput = function(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

window.generarIdUnico = function() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

window.sanitizarTexto = function(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// === VERIFICACIÓN DE CONEXIÓN FIREBASE ===
window.verificarConexionFirebase = async function() {
  try {
    if (!window.db) {
      console.error('❌ window.db no está disponible');
      return false;
    }
    await window.db.ref('negocios/' + window.NEGOCIO_ID).once('value');
    console.log('✅ Conexión Firebase verificada');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión Firebase:', error);
    return false;
  }
};

// === MANEJO DE ERRORES GLOBAL ===
window.manejarErrorFirebase = function(error, contexto = '') {
  console.error(`❌ Error${contexto ? ' en ' + contexto : ''}:`, error);
  
  const erroresComunes = {
    'PERMISSION_DENIED': '❌ No tienes permisos para realizar esta acción',
    'NETWORK_ERROR': '🔴 Error de conexión. Verifica tu internet',
    'auth/invalid-credential': '❌ Credenciales inválidas',
    'auth/user-not-found': '❌ Usuario no encontrado',
    'auth/wrong-password': '❌ Contraseña incorrecta',
    'storage/unauthorized': '❌ No autorizado para subir archivos',
    'storage/quota-exceeded': '❌ Cuota de almacenamiento excedida'
  };
  
  return erroresComunes[error?.code] || `❌ Error: ${error?.message || 'Error desconocido'}`;
};

// === CONFIGURACIÓN MULTI-SaaS ===
window.rutaNegocio = function(path) {
  return `negocios/${window.NEGOCIO_ID}/${path}`;
};

window.refNegocio = function(path) {
  try {
    if (!window.db) throw new Error('window.db no disponible');
    return window.db.ref(window.rutaNegocio(path));
  } catch (error) {
    console.error('❌ Error creando referencia:', error);
    return window.db?.ref('error') || null;
  }
};

// === EVENTO: Negocio cambiado en URL ===
window.addEventListener('popstate', () => {
  try {
    const nuevoNegocio = getNegocioId();
    if (nuevoNegocio !== window.NEGOCIO_ID) {
      console.log('🔄 Negocio cambiado, recargando...');
      window.NEGOCIO_ID = nuevoNegocio;
    }
  } catch (e) {
    console.warn('⚠️ Error en popstate:', e);
  }
});

// === LOG DE INICIALIZACIÓN ===
console.group('🚀 Panel Admin - Inicialización');
if (typeof firebase !== 'undefined') {
  console.log('📦 Firebase App:', firebase.apps[0]?.name || 'N/A');
} else {
  console.log('❌ Firebase SDK no cargado');
}
console.log('🏢 Negocio ID:', window.NEGOCIO_ID);
if (typeof firebase !== 'undefined') {
  console.log('🔗 Database URL:', firebaseConfig.databaseURL);
  console.log('💾 Storage Bucket:', firebaseConfig.storageBucket);
}
console.log('🗄️ Storage disponible:', window.storage !== null ? '✅ Sí' : '❌ No');
console.log('🔐 Auth disponible:', window.auth !== null ? '✅ Sí' : '❌ No');
console.log('🗄️ DB disponible:', window.db !== null ? '✅ Sí' : '❌ No');
console.groupEnd();

// === EXPORTAR CONFIG PARA MÓDULOS ===
window.ADMIN_CONFIG = {
  version: '1.0.0',
  negocioId: window.NEGOCIO_ID,
  firebase: firebaseConfig,
  features: {
    pedidos: true,
    menu: true,
    fidelizacion: true,
    reportes: true,
    config: true
  }
};

// === FUNCIÓN DE DIAGNÓSTICO (para debug) ===
window.diagnosticarFirebase = function() {
  console.log('🔍 Diagnóstico Firebase:');
  console.log('- firebase definido:', typeof firebase !== 'undefined');
  console.log('- firebase.apps:', firebase?.apps?.length || 0);
  console.log('- window.auth:', window.auth ? '✅' : '❌');
  console.log('- window.db:', window.db ? '✅' : '❌');
  console.log('- window.storage:', window.storage ? '✅' : '❌');
  console.log('- NEGOCIO_ID:', window.NEGOCIO_ID);
  
  if (window.auth) {
    console.log('- Usuario actual:', window.auth.currentUser?.email || 'No autenticado');
  }
};