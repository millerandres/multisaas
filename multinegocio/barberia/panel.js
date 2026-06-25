// barberia/panel.js
// Panel de Barbería - Lógica completa

let negocioId = null;
let negocioData = null;
let currentBarberoId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Panel de Barbería cargado');
  inicializarPanel();
});

async function inicializarPanel() {
  // Obtener ID de la URL
  const params = new URLSearchParams(window.location.search);
  negocioId = params.get('negocio') || params.get('id');
  
  if (!negocioId) {
    mostrarError('No se especificó un negocio');
    return;
  }
  
  console.log('📋 Negocio ID:', negocioId);
  
  // Cargar datos del negocio
  await cargarDatosNegocio();
  
  // Configurar navegación
  configurarNavegacion();
  
  // Cargar datos iniciales (dashboard)
  await cargarDashboard();
}

async function cargarDatosNegocio() {
  try {
    if (typeof db !== 'undefined') {
      const snapshot = await db.ref('negocios').orderByChild('slug').equalTo(negocioId).once('value');
      
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          negocioData = child.val();
          negocioId = child.key;
        });
      } else {
        const doc = await db.ref(`negocios/${negocioId}`).once('value');
        if (doc.exists()) {
          negocioData = doc.val();
        }
      }
      
      if (negocioData) {
        document.getElementById('negocio-nombre').textContent = negocioData.nombre || 'Barbería';
      }
    } else {
      negocioData = { nombre: 'Barbería Demo' };
      document.getElementById('negocio-nombre').textContent = 'Barbería Demo';
    }
  } catch (error) {
    console.error('Error cargando negocio:', error);
    document.getElementById('negocio-nombre').textContent = 'Barbería';
  }
}

async function cargarDashboard() {
  await cargarEstadisticas();
  await cargarCitasHoy();
  await cargarBarberosDashboard();
}

async function cargarEstadisticas() {
  const stats = {
    citasHoy: Math.floor(Math.random() * 15) + 5,
    ingresosHoy: Math.floor(Math.random() * 500000) + 100000,
    barberosActivos: Math.floor(Math.random() * 4) + 2,
    proximasCitas: Math.floor(Math.random() * 10) + 3
  };
  
  document.getElementById('citas-hoy').textContent = stats.citasHoy;
  document.getElementById('ingresos-hoy').textContent = `$${stats.ingresosHoy.toLocaleString()}`;
  document.getElementById('barberos-activos').textContent = stats.barberosActivos;
  document.getElementById('proximas-citas').textContent = stats.proximasCitas;
}

async function cargarCitasHoy() {
  const container = document.getElementById('lista-citas-hoy');
  
  const citasEjemplo = [
    { cliente: 'Carlos Martínez', hora: '9:00 AM', servicio: 'Corte Clásico', barbero: 'Juan', estado: 'confirmada' },
    { cliente: 'Andrés López', hora: '10:30 AM', servicio: 'Corte + Barba', barbero: 'Pedro', estado: 'pendiente' },
    { cliente: 'Miguel Ángel', hora: '12:00 PM', servicio: 'Arreglo de Barba', barbero: 'Juan', estado: 'completada' }
  ];
  
  container.innerHTML = citasEjemplo.map(cita => `
    <div class="cita-item">
      <div class="cita-avatar">${cita.cliente.charAt(0)}</div>
      <div class="cita-info">
        <h4>${cita.cliente}</h4>
        <p>${cita.servicio} • ${cita.barbero}</p>
      </div>
      <div class="cita-time">${cita.hora}</div>
      <span class="cita-status status-${cita.estado}">${cita.estado}</span>
    </div>
  `).join('');
}

async function cargarBarberosDashboard() {
  const container = document.getElementById('lista-barberos');
  
  console.log('🔄 Cargando barberos para dashboard...');
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/barberos`).once('value');
      
      if (!snapshot.exists()) {
        container.innerHTML = '<p style="color: #95a5a6; text-align: center; padding: 20px;">No hay barberos registrados</p>';
        return;
      }
      
      const barberos = [];
      snapshot.forEach(child => {
        barberos.push({ id: child.key, ...child.val() });
      });
      
      console.log('📦 Barberos para dashboard:', barberos.length);
      
      // Mostrar solo los primeros 3
      container.innerHTML = barberos.slice(0, 3).map(barbero => `
        <div class="cita-item">
          <div class="cita-avatar" style="background: #9b59b6;">${barbero.nombre.charAt(0).toUpperCase()}</div>
          <div class="cita-info">
            <h4>${barbero.nombre}</h4>
            <p>${barbero.especialidad || 'N/A'}</p>
          </div>
          <div class="cita-time">${barbero.citasHoy || 0} citas</div>
        </div>
      `).join('');
    } else {
      const barberosEjemplo = [
        { nombre: 'Juan Pérez', citasHoy: 8, especialidad: 'Cortes Clásicos' },
        { nombre: 'Pedro Gómez', citasHoy: 6, especialidad: 'Barbas' },
        { nombre: 'Carlos Ruiz', citasHoy: 5, especialidad: 'Cortes Modernos' }
      ];
      
      container.innerHTML = barberosEjemplo.map(barbero => `
        <div class="cita-item">
          <div class="cita-avatar" style="background: #9b59b6;">${barbero.nombre.charAt(0)}</div>
          <div class="cita-info">
            <h4>${barbero.nombre}</h4>
            <p>${barbero.especialidad}</p>
          </div>
          <div class="cita-time">${barbero.citasHoy} citas</div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('❌ Error cargando barberos para dashboard:', error);
    container.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 20px;">Error al cargar barberos</p>';
  }
}

// ==================== NAVEGACIÓN ====================
function configurarNavegacion() {
  const links = document.querySelectorAll('.sidebar-nav a');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const section = link.dataset.section;
      
      // Remover active de todos
      links.forEach(l => l.classList.remove('active'));
      
      // Agregar active al clickeado
      link.classList.add('active');
      
      // Ocultar todas las secciones
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      
      // Mostrar sección seleccionada
      const targetSection = document.getElementById(`section-${section}`);
      if (targetSection) {
        targetSection.classList.add('active');
        document.getElementById('page-title').textContent = link.textContent.trim();
        
        // Cargar datos específicos
        if (section === 'barberos') {
          cargarBarberos();
        } else if (section === 'dashboard') {
          cargarDashboard();
        }
      }
    });
  });
}

function navegarA(section) {
  const link = document.querySelector(`.sidebar-nav a[data-section="${section}"]`);
  if (link) {
    link.click();
  }
}

// ==================== GESTIÓN DE BARBEROS ====================

async function cargarBarberos() {
  const tbody = document.getElementById('tabla-barberos');
  
  console.log(' Cargando barberos para negocio:', negocioId);
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      console.log('📡 Consultando Firebase en: negocios/' + negocioId + '/barberos');
      
      const snapshot = await db.ref(`negocios/${negocioId}/barberos`).once('value');
      
      console.log('📦 Datos recibidos:', snapshot.exists() ? snapshot.numChildren() + ' barberos' : 'Sin datos');
      
      if (!snapshot.exists()) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center" style="padding: 40px; color: #95a5a6;">
              <div style="font-size: 3rem; margin-bottom: 15px;">👤</div>
              <p>No hay barberos registrados</p>
              <button class="btn-primary" onclick="abrirModalBarbero()" style="margin-top: 15px;">
                ➕ Agregar primer barbero
              </button>
            </td>
          </tr>
        `;
        return;
      }
      
      const barberos = [];
      snapshot.forEach(child => {
        const data = child.val();
        console.log('👤 Barbero encontrado:', child.key, data);
        barberos.push({ id: child.key, ...data });
      });
      
      console.log('✅ Total barberos a mostrar:', barberos.length);
      renderizarTablaBarberos(barberos);
      
    } else {
      console.log('⚠️ Modo demo - sin Firebase');
      // Datos de ejemplo para modo demo
      const barberosEjemplo = [
        { 
          id: '1', 
          nombre: 'Juan Pérez', 
          especialidad: 'Cortes', 
          telefono: '3001234567',
          email: 'juan@barberia.com',
          estado: 'activo',
          foto: null,
          citasHoy: 8
        },
        { 
          id: '2', 
          nombre: 'Pedro Gómez', 
          especialidad: 'Barbas', 
          telefono: '3009876543',
          email: 'pedro@barberia.com',
          estado: 'activo',
          foto: null,
          citasHoy: 6
        }
      ];
      
      renderizarTablaBarberos(barberosEjemplo);
    }
  } catch (error) {
    console.error('❌ Error cargando barberos:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="padding: 40px; color: #e74c3c;">
          <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
          <p>Error al cargar barberos</p>
          <small>${error.message}</small>
        </td>
      </tr>
    `;
  }
}

function renderizarTablaBarberos(barberos) {
  const tbody = document.getElementById('tabla-barberos');
  
  console.log('🎨 Renderizando tabla con', barberos.length, 'barberos');
  
  if (barberos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="padding: 40px; color: #95a5a6;">
          No hay barberos registrados
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = barberos.map(barbero => {
    const fotoHTML = barbero.foto 
      ? `<img src="${barbero.foto}" alt="${barbero.nombre}" class="barbero-foto">`
      : `<div class="barbero-foto-placeholder">${barbero.nombre.charAt(0).toUpperCase()}</div>`;
    
    const estadoBadge = barbero.estado === 'activo' 
      ? '<span class="badge badge-success">Activo</span>'
      : '<span class="badge badge-secondary">Inactivo</span>';
    
    return `
      <tr>
        <td>${fotoHTML}</td>
        <td><strong>${barbero.nombre}</strong></td>
        <td>${barbero.especialidad || 'N/A'}</td>
        <td>${barbero.telefono || 'N/A'}</td>
        <td>${estadoBadge}</td>
        <td>${barbero.citasHoy || 0}</td>
        <td>
          <button class="btn-action btn-edit" onclick="editarBarbero('${barbero.id}')" title="Editar">
            ✏️
          </button>
          <button class="btn-action btn-delete" onclick="eliminarBarbero('${barbero.id}', '${barbero.nombre}')" title="Eliminar">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function abrirModalBarbero(barberoId = null) {
  currentBarberoId = barberoId;
  const form = document.getElementById('form-barbero');
  form.reset();
  document.getElementById('barbero-foto-preview').innerHTML = '';
  
  if (barberoId) {
    document.getElementById('modal-barbero-titulo').textContent = 'Editar Barbero';
    cargarDatosBarbero(barberoId);
  } else {
    document.getElementById('modal-barbero-titulo').textContent = 'Nuevo Barbero';
    document.getElementById('barbero-id').value = '';
  }
  
  document.getElementById('modal-barbero').classList.add('show');
}

function cerrarModalBarbero() {
  document.getElementById('modal-barbero').classList.remove('show');
  currentBarberoId = null;
}

async function cargarDatosBarbero(barberoId) {
  console.log('📥 Cargando datos del barbero:', barberoId);
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/barberos/${barberoId}`).once('value');
      
      if (snapshot.exists()) {
        const barbero = snapshot.val();
        console.log('📦 Datos cargados:', barbero);
        
        document.getElementById('barbero-id').value = barberoId;
        document.getElementById('barbero-nombre').value = barbero.nombre || '';
        document.getElementById('barbero-especialidad').value = barbero.especialidad || '';
        document.getElementById('barbero-telefono').value = barbero.telefono || '';
        document.getElementById('barbero-email').value = barbero.email || '';
        document.getElementById('barbero-estado').value = barbero.estado || 'activo';
        
        if (barbero.foto) {
          document.getElementById('barbero-foto-preview').innerHTML = `
            <img src="${barbero.foto}" alt="Foto actual" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-top: 10px;">
          `;
        }
      } else {
        console.warn('⚠️ Barbero no encontrado:', barberoId);
      }
    }
  } catch (error) {
    console.error('❌ Error cargando datos del barbero:', error);
  }
}

async function guardarBarbero() {
  console.log('💾 Guardando barbero...');
  
  const id = document.getElementById('barbero-id').value;
  const nombre = document.getElementById('barbero-nombre').value.trim();
  const especialidad = document.getElementById('barbero-especialidad').value;
  const telefono = document.getElementById('barbero-telefono').value.trim();
  const email = document.getElementById('barbero-email').value.trim();
  const estado = document.getElementById('barbero-estado').value;
  
  console.log('📝 Datos del formulario:', { id, nombre, especialidad, telefono, email, estado });
  
  if (!nombre || !especialidad) {
    mostrarToast('❌ Nombre y especialidad son obligatorios', 'error');
    return;
  }
  
  try {
    const barberoData = {
      nombre,
      especialidad,
      telefono,
      email,
      estado,
      actualizadoEn: Date.now()
    };
    
    if (typeof db !== 'undefined' && negocioId) {
      console.log('📡 Guardando en Firebase: negocios/' + negocioId + '/barberos');
      
      // Subir foto si existe
      const fotoInput = document.getElementById('barbero-foto');
      if (fotoInput.files && fotoInput.files[0]) {
        console.log('📷 Subiendo foto...');
        const fotoUrl = await subirFotoBarbero(fotoInput.files[0], id || Date.now().toString());
        if (fotoUrl) {
          barberoData.foto = fotoUrl;
          console.log('✅ Foto subida:', fotoUrl);
        }
      }
      
      if (id) {
        // Actualizar barbero existente
        console.log('🔄 Actualizando barbero:', id);
        await db.ref(`negocios/${negocioId}/barberos/${id}`).update(barberoData);
        mostrarToast('✅ Barbero actualizado correctamente', 'success');
      } else {
        // Crear nuevo barbero
        console.log(' Creando nuevo barbero');
        barberoData.creadoEn = Date.now();
        barberoData.citasHoy = 0;
        const newRef = db.ref(`negocios/${negocioId}/barberos`).push(barberoData);
        console.log('✅ Barbero creado con ID:', newRef.key);
        mostrarToast('✅ Barbero creado correctamente', 'success');
      }
    } else {
      console.log('⚠️ Modo demo - barbero guardado localmente');
      mostrarToast('✅ Barbero guardado (modo demo)', 'success');
    }
    
    // Cerrar modal
    cerrarModalBarbero();
    
    // Recargar la tabla
    console.log('🔄 Recargando tabla de barberos...');
    await cargarBarberos();
    
    // Recargar dashboard
    console.log('🔄 Recargando dashboard...');
    await cargarDashboard();
    
  } catch (error) {
    console.error('❌ Error guardando barbero:', error);
    mostrarToast(' Error al guardar: ' + error.message, 'error');
  }
}

async function subirFotoBarbero(file, barberoId) {
  try {
    const storageRef = firebase.storage().ref();
    const fotoRef = storageRef.child(`negocios/${negocioId}/barberos/${barberoId}/foto.jpg`);
    await fotoRef.put(file);
    const downloadURL = await fotoRef.getDownloadURL();
    return downloadURL;
  } catch (error) {
    console.error('Error subiendo foto:', error);
    return null;
  }
}

function editarBarbero(barberoId) {
  abrirModalBarbero(barberoId);
}

async function eliminarBarbero(barberoId, nombre) {
  console.log('🗑️ Eliminando barbero:', barberoId, nombre);
  
  if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) {
    console.log('❌ Eliminación cancelada por el usuario');
    return;
  }
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      console.log('📡 Eliminando de Firebase: negocios/' + negocioId + '/barberos/' + barberoId);
      
      await db.ref(`negocios/${negocioId}/barberos/${barberoId}`).remove();
      
      console.log('✅ Barbero eliminado');
      mostrarToast('✅ Barbero eliminado correctamente', 'success');
      
      // Recargar tabla
      await cargarBarberos();
      await cargarDashboard();
    } else {
      console.log('⚠️ Modo demo');
      mostrarToast('✅ Barbero eliminado (modo demo)', 'success');
    }
  } catch (error) {
    console.error('❌ Error eliminando barbero:', error);
    mostrarToast('❌ Error al eliminar: ' + error.message, 'error');
  }
}

// ==================== FUNCIONES AUXILIARES ====================

function mostrarToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toastId = 'toast-' + Date.now();
  
  const toastHTML = `
    <div id="${toastId}" class="toast toast-${type}">
      <div style="flex: 1;">${message}</div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #95a5a6;">×</button>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', toastHTML);
  
  setTimeout(() => {
    const toast = document.getElementById(toastId);
    if (toast) toast.remove();
  }, 3000);
}

function mostrarError(mensaje) {
  document.querySelector('.main-content').innerHTML = `
    <div style="text-align: center; padding: 50px;">
      <h2 style="color: #e74c3c;">⚠️ Error</h2>
      <p>${mensaje}</p>
      <button onclick="window.close()" class="btn-secondary" style="margin-top: 20px;">Cerrar</button>
    </div>
  `;
}

function cerrarSesion() {
  if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
    window.close();
  }
}

// Verificar autenticación
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    console.log('✅ Usuario autenticado:', user.email);
    document.getElementById('loginModal')?.classList.remove('show');
    await inicializarPanel();
  } else {
    console.log('❌ No hay sesión - Mostrar login');
    document.getElementById('loginModal')?.classList.add('show');
  }
});

// Manejar login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
  } catch (error) {
    document.getElementById('loginError').textContent = error.message;
    document.getElementById('loginError').classList.remove('d-none');
  }
});