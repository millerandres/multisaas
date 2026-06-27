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
  const params = new URLSearchParams(window.location.search);
  negocioId = params.get('negocio') || params.get('id');
  
  if (!negocioId) {
    mostrarError('No se especificó un negocio');
    return;
  }
  
  console.log('📋 Negocio ID:', negocioId);
  
  await cargarDatosNegocio();
  configurarNavegacion();
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
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const [citasSnapshot, barberosSnapshot, serviciosSnapshot] = await Promise.all([
        db.ref(`negocios/${negocioId}/citas`).once('value'),
        db.ref(`negocios/${negocioId}/barberos`).once('value'),
        db.ref(`negocios/${negocioId}/servicios`).once('value')
      ]);
      
      const hoy = new Date().toDateString();
      let citasHoy = 0;
      let ingresosHoy = 0;
      
      if (citasSnapshot.exists()) {
        citasSnapshot.forEach(child => {
          const cita = child.val();
          const fechaCita = new Date(cita.fecha || cita.fechaCreacion).toDateString();
          if (fechaCita === hoy) {
            citasHoy++;
            if (cita.estado === 'completada' || cita.estado === 'confirmada') {
              ingresosHoy += cita.precio || 0;
            }
          }
        });
      }
      
      let barberosActivos = 0;
      if (barberosSnapshot.exists()) {
        barberosSnapshot.forEach(child => {
          const barbero = child.val();
          if (barbero.estado === 'activo') {
            barberosActivos++;
          }
        });
      }
      
      let proximasCitas = 0;
      const ahora = new Date();
      if (citasSnapshot.exists()) {
        citasSnapshot.forEach(child => {
          const cita = child.val();
          const fechaCita = new Date(cita.fecha || cita.fechaCreacion);
          if (fechaCita > ahora && (cita.estado === 'pendiente' || cita.estado === 'confirmada')) {
            proximasCitas++;
          }
        });
      }
      
      document.getElementById('citas-hoy').textContent = citasHoy;
      document.getElementById('ingresos-hoy').textContent = `$${ingresosHoy.toLocaleString()}`;
      document.getElementById('barberos-activos').textContent = barberosActivos;
      document.getElementById('proximas-citas').textContent = proximasCitas;
    } else {
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
  } catch (error) {
    console.error('❌ Error cargando estadísticas:', error);
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
}

async function cargarCitasHoy() {
  const container = document.getElementById('lista-citas-hoy');
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/citas`).once('value');
      
      if (!snapshot.exists()) {
        container.innerHTML = '<p style="color: #95a5a6; text-align: center; padding: 20px;">No hay citas para hoy</p>';
        return;
      }
      
      const hoy = new Date().toDateString();
      const citasHoy = [];
      
      snapshot.forEach(child => {
        const cita = child.val();
        const fechaCita = new Date(cita.fecha || cita.fechaCreacion).toDateString();
        if (fechaCita === hoy) {
          citasHoy.push({ id: child.key, ...cita });
        }
      });
      
      if (citasHoy.length === 0) {
        container.innerHTML = '<p style="color: #95a5a6; text-align: center; padding: 20px;">No hay citas para hoy</p>';
        return;
      }
      
      citasHoy.sort((a, b) => {
        const horaA = a.hora || '00:00';
        const horaB = b.hora || '00:00';
        return horaA.localeCompare(horaB);
      });
      
      container.innerHTML = citasHoy.slice(0, 5).map(cita => `
        <div class="cita-item">
          <div class="cita-avatar">${(cita.cliente || 'C').charAt(0)}</div>
          <div class="cita-info">
            <h4>${cita.cliente || 'Cliente'}</h4>
            <p>${cita.servicio || 'Servicio'} • ${cita.barbero || 'Barbero'}</p>
          </div>
          <div class="cita-time">${cita.hora || '--:--'}</div>
          <span class="cita-status status-${cita.estado || 'pendiente'}">${cita.estado || 'pendiente'}</span>
        </div>
      `).join('');
    } else {
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
  } catch (error) {
    console.error('❌ Error cargando citas de hoy:', error);
    container.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 20px;">Error al cargar citas</p>';
  }
}

async function cargarBarberosDashboard() {
  const container = document.getElementById('lista-barberos');
  
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
      
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      
      const targetSection = document.getElementById(`section-${section}`);
      if (targetSection) {
        targetSection.classList.add('active');
        document.getElementById('page-title').textContent = link.textContent.trim();
        
        if (section === 'barberos') {
          cargarBarberos();
        } else if (section === 'servicios') {
          cargarServicios();
        } else if (section === 'citas') {
          cargarCitas();
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
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/barberos`).once('value');
      
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
        barberos.push({ id: child.key, ...child.val() });
      });
      
      renderizarTablaBarberos(barberos);
      
    } else {
      const barberosEjemplo = [
        { id: '1', nombre: 'Juan Pérez', especialidad: 'Cortes', telefono: '3001234567', email: 'juan@barberia.com', estado: 'activo', foto: null, citasHoy: 8 },
        { id: '2', nombre: 'Pedro Gómez', especialidad: 'Barbas', telefono: '3009876543', email: 'pedro@barberia.com', estado: 'activo', foto: null, citasHoy: 6 }
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
          <button class="btn-action btn-edit" onclick="editarBarbero('${barbero.id}')" title="Editar">✏️</button>
          <button class="btn-action btn-delete" onclick="eliminarBarbero('${barbero.id}', '${barbero.nombre}')" title="Eliminar">🗑️</button>
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
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/barberos/${barberoId}`).once('value');
      
      if (snapshot.exists()) {
        const barbero = snapshot.val();
        
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
      }
    }
  } catch (error) {
    console.error('❌ Error cargando datos del barbero:', error);
  }
}

async function guardarBarbero() {
  const id = document.getElementById('barbero-id').value;
  const nombre = document.getElementById('barbero-nombre').value.trim();
  const especialidad = document.getElementById('barbero-especialidad').value;
  const telefono = document.getElementById('barbero-telefono').value.trim();
  const email = document.getElementById('barbero-email').value.trim();
  const estado = document.getElementById('barbero-estado').value;
  
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
      const fotoInput = document.getElementById('barbero-foto');
      if (fotoInput.files && fotoInput.files[0]) {
        const fotoUrl = await subirFotoBarbero(fotoInput.files[0], id || Date.now().toString());
        if (fotoUrl) {
          barberoData.foto = fotoUrl;
        }
      }
      
      if (id) {
        await db.ref(`negocios/${negocioId}/barberos/${id}`).update(barberoData);
        mostrarToast('✅ Barbero actualizado correctamente', 'success');
      } else {
        barberoData.creadoEn = Date.now();
        barberoData.citasHoy = 0;
        await db.ref(`negocios/${negocioId}/barberos`).push(barberoData);
        mostrarToast('✅ Barbero creado correctamente', 'success');
      }
    } else {
      mostrarToast('✅ Barbero guardado (modo demo)', 'success');
    }
    
    cerrarModalBarbero();
    await cargarBarberos();
    await cargarDashboard();
    
  } catch (error) {
    console.error('❌ Error guardando barbero:', error);
    mostrarToast('❌ Error al guardar: ' + error.message, 'error');
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
  if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return;
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      await db.ref(`negocios/${negocioId}/barberos/${barberoId}`).remove();
      mostrarToast('✅ Barbero eliminado correctamente', 'success');
      await cargarBarberos();
      await cargarDashboard();
    } else {
      mostrarToast('✅ Barbero eliminado (modo demo)', 'success');
    }
  } catch (error) {
    console.error('❌ Error eliminando barbero:', error);
    mostrarToast('❌ Error al eliminar: ' + error.message, 'error');
  }
}

// ==================== GESTIÓN DE SERVICIOS ====================

async function cargarServicios() {
  const tbody = document.getElementById('tabla-servicios');
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/servicios`).once('value');
      
      if (!snapshot.exists()) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center" style="padding: 40px; color: #95a5a6;">
              <div style="font-size: 3rem; margin-bottom: 15px;">✂️</div>
              <p>No hay servicios registrados</p>
              <button class="btn-primary" onclick="abrirModalServicio()" style="margin-top: 15px;">
                ➕ Agregar primer servicio
              </button>
            </td>
          </tr>
        `;
        return;
      }
      
      const servicios = [];
      snapshot.forEach(child => {
        servicios.push({ id: child.key, ...child.val() });
      });
      
      renderizarTablaServicios(servicios);
      
    } else {
      const serviciosEjemplo = [
        { id: '1', nombre: 'Corte de Cabello Clásico', descripcion: 'Corte tradicional', categoria: 'Corte', duracion: 30, precio: 15000, icono: '✂️', estado: 'activo' },
        { id: '2', nombre: 'Arreglo de Barba', descripcion: 'Perfilado de barba', categoria: 'Barba', duracion: 20, precio: 10000, icono: '🧔', estado: 'activo' },
        { id: '3', nombre: 'Corte + Barba Combo', descripcion: 'Combo completo', categoria: 'Combo', duracion: 45, precio: 22000, icono: '💈', estado: 'activo' }
      ];
      
      renderizarTablaServicios(serviciosEjemplo);
    }
  } catch (error) {
    console.error('❌ Error cargando servicios:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 40px; color: #e74c3c;">
          <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
          <p>Error al cargar servicios</p>
        </td>
      </tr>
    `;
  }
}

function renderizarTablaServicios(servicios) {
  const tbody = document.getElementById('tabla-servicios');
  
  if (servicios.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 40px; color: #95a5a6;">
          No hay servicios registrados
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = servicios.map(servicio => {
    const estadoBadge = servicio.estado === 'activo' 
      ? '<span class="badge badge-success">Activo</span>'
      : '<span class="badge badge-secondary">Inactivo</span>';
    
    const precioFormateado = typeof servicio.precio === 'number' 
      ? `$${servicio.precio.toLocaleString()}` 
      : `$${parseFloat(servicio.precio).toFixed(2)}`;
    
    return `
      <tr>
        <td style="font-size: 1.5rem;">${servicio.icono || '✂️'}</td>
        <td><strong>${servicio.nombre}</strong></td>
        <td style="color: #7f8c8d; font-size: 0.9rem;">${servicio.descripcion || '-'}</td>
        <td>${servicio.duracion} min</td>
        <td><strong style="color: #27ae60;">${precioFormateado}</strong></td>
        <td><span class="badge badge-secondary">${servicio.categoria}</span></td>
        <td>${estadoBadge}</td>
        <td>
          <button class="btn-action btn-edit" onclick="editarServicio('${servicio.id}')" title="Editar">✏️</button>
          <button class="btn-action btn-delete" onclick="eliminarServicio('${servicio.id}', '${servicio.nombre}')" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function abrirModalServicio(servicioId = null) {
  const form = document.getElementById('form-servicio');
  form.reset();
  
  if (servicioId) {
    document.getElementById('modal-servicio-titulo').textContent = 'Editar Servicio';
    cargarDatosServicio(servicioId);
  } else {
    document.getElementById('modal-servicio-titulo').textContent = 'Nuevo Servicio';
    document.getElementById('servicio-id').value = '';
  }
  
  document.getElementById('modal-servicio').classList.add('show');
}

function cerrarModalServicio() {
  document.getElementById('modal-servicio').classList.remove('show');
}

async function cargarDatosServicio(servicioId) {
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/servicios/${servicioId}`).once('value');
      
      if (snapshot.exists()) {
        const servicio = snapshot.val();
        
        document.getElementById('servicio-id').value = servicioId;
        document.getElementById('servicio-nombre').value = servicio.nombre || '';
        document.getElementById('servicio-descripcion').value = servicio.descripcion || '';
        document.getElementById('servicio-categoria').value = servicio.categoria || '';
        document.getElementById('servicio-duracion').value = servicio.duracion || 30;
        document.getElementById('servicio-precio').value = servicio.precio || 0;
        document.getElementById('servicio-icono').value = servicio.icono || '✂️';
        document.getElementById('servicio-estado').value = servicio.estado || 'activo';
      }
    }
  } catch (error) {
    console.error('❌ Error cargando datos del servicio:', error);
  }
}

async function guardarServicio() {
  const id = document.getElementById('servicio-id').value;
  const nombre = document.getElementById('servicio-nombre').value.trim();
  const descripcion = document.getElementById('servicio-descripcion').value.trim();
  const categoria = document.getElementById('servicio-categoria').value;
  const duracion = parseInt(document.getElementById('servicio-duracion').value);
  const precio = parseFloat(document.getElementById('servicio-precio').value);
  const icono = document.getElementById('servicio-icono').value;
  const estado = document.getElementById('servicio-estado').value;
  
  if (!nombre || !categoria || !duracion || isNaN(precio)) {
    mostrarToast('❌ Por favor complete todos los campos obligatorios', 'error');
    return;
  }
  
  const servicioData = {
    nombre, descripcion, categoria, duracion, precio, icono, estado,
    actualizadoEn: Date.now()
  };
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      if (id) {
        await db.ref(`negocios/${negocioId}/servicios/${id}`).update(servicioData);
        mostrarToast('✅ Servicio actualizado correctamente', 'success');
      } else {
        servicioData.creadoEn = Date.now();
        await db.ref(`negocios/${negocioId}/servicios`).push(servicioData);
        mostrarToast('✅ Servicio creado correctamente', 'success');
      }
    } else {
      mostrarToast('✅ Servicio guardado (modo demo)', 'success');
    }
    
    cerrarModalServicio();
    await cargarServicios();
    
  } catch (error) {
    console.error('❌ Error guardando servicio:', error);
    mostrarToast('❌ Error al guardar: ' + error.message, 'error');
  }
}

function editarServicio(servicioId) {
  abrirModalServicio(servicioId);
}

async function eliminarServicio(servicioId, nombre) {
  if (!confirm(`¿Estás seguro de eliminar el servicio "${nombre}"?`)) return;
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      await db.ref(`negocios/${negocioId}/servicios/${servicioId}`).remove();
      mostrarToast('✅ Servicio eliminado correctamente', 'success');
      await cargarServicios();
    } else {
      mostrarToast('✅ Servicio eliminado (modo demo)', 'success');
    }
  } catch (error) {
    console.error('❌ Error eliminando servicio:', error);
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

// ==================== GESTIÓN DE CITAS ====================

let citaVistaActual = 'dia';
let citasData = [];
let serviciosData = [];
let barberosData = [];
let cargandoDatosCita = false;

async function cargarCitas() {
  console.log('🔄 Cargando citas para negocio:', negocioId);
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/citas`).once('value');
      
      if (!snapshot.exists()) {
        citasData = [];
        await poblarFiltrosCitas(); // 🔑 Cargar filtros incluso si no hay citas
        actualizarVistaCitas();
        return;
      }
      
      citasData = [];
      snapshot.forEach(child => {
        citasData.push({ id: child.key, ...child.val() });
      });
      
      console.log('✅ Total citas cargadas:', citasData.length);
      
      citasData.sort((a, b) => {
        const fechaA = new Date(`${a.fecha}T${a.hora || '00:00'}`);
        const fechaB = new Date(`${b.fecha}T${b.hora || '00:00'}`);
        return fechaA - fechaB;
      });
      
      // 🔑 POBLAR FILTROS DESPUÉS DE CARGAR CITAS
      await poblarFiltrosCitas();
      
      actualizarVistaCitas();
      
    } else {
      citasData = generarCitasEjemplo();
      await poblarFiltrosCitas();
      actualizarVistaCitas();
    }
  } catch (error) {
    console.error('❌ Error cargando citas:', error);
    mostrarToast('❌ Error al cargar citas', 'error');
  }
}

// 🔑 NUEVA FUNCIÓN: Poblar filtros de citas con barberos
async function poblarFiltrosCitas() {
  console.log('🔄 Poblando filtros de citas...');
  
  try {
    // Cargar barberos para el filtro
    if (typeof db !== 'undefined' && negocioId) {
      const barberosSnapshot = await db.ref(`negocios/${negocioId}/barberos`).once('value');
      barberosData = [];
      
      if (barberosSnapshot.exists()) {
        barberosSnapshot.forEach(child => {
          barberosData.push({ id: child.key, ...child.val() });
        });
      }
    } else {
      barberosData = [
        { id: '1', nombre: 'Juan Pérez', especialidad: 'Cortes', estado: 'activo' },
        { id: '2', nombre: 'Pedro Gómez', especialidad: 'Barbas', estado: 'activo' },
        { id: '3', nombre: 'Carlos Ruiz', especialidad: 'Ambos', estado: 'activo' }
      ];
    }
    
    console.log('✅ Barberos cargados para filtro:', barberosData.length);
    
    // 🔑 Poblar select de filtro de barberos
    const selectFiltroBarbero = document.getElementById('filtro-barbero');
    if (selectFiltroBarbero) {
      selectFiltroBarbero.innerHTML = '<option value="">Todos los barberos</option>';
      
      barberosData.forEach(barbero => {
        if (barbero.estado === 'activo' || !barbero.estado) {
          const opcion = document.createElement('option');
          opcion.value = barbero.nombre;
          opcion.textContent = barbero.nombre;
          selectFiltroBarbero.appendChild(opcion);
        }
      });
      
      console.log('✅ Filtro de barberos poblado con', selectFiltroBarbero.options.length - 1, 'opciones');
    }
    
  } catch (error) {
    console.error('❌ Error poblando filtros:', error);
  }
}

function generarCitasEjemplo() {
  const hoy = new Date();
  const citas = [];
  
  for (let i = 0; i < 10; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + Math.floor(Math.random() * 7));
    
    citas.push({
      id: `cita-${i}`,
      fecha: fecha.toISOString().split('T')[0],
      hora: `${9 + Math.floor(Math.random() * 8)}:00`,
      cliente: `Cliente ${i + 1}`,
      telefono: `300${Math.floor(Math.random() * 9000000 + 1000000)}`,
      servicio: 'Corte de Cabello',
      barbero: 'Juan Pérez',
      duracion: 30,
      precio: 15000,
      estado: ['pendiente', 'confirmada', 'completada'][Math.floor(Math.random() * 3)],
      notas: ''
    });
  }
  
  return citas;
}

function cambiarVistaCitas(vista) {
  citaVistaActual = vista;
  document.getElementById('btn-vista-dia').classList.toggle('active', vista === 'dia');
  document.getElementById('btn-vista-semana').classList.toggle('active', vista === 'semana');
  document.getElementById('vista-dia').style.display = vista === 'dia' ? 'block' : 'none';
  document.getElementById('vista-semana').style.display = vista === 'semana' ? 'block' : 'none';
  actualizarVistaCitas();
}

function aplicarFiltrosCitas() {
  actualizarVistaCitas();
}

function getCitasFiltradas() {
  const fechaFiltro = document.getElementById('filtro-fecha')?.value;
  const barberoFiltro = document.getElementById('filtro-barbero')?.value;
  const estadoFiltro = document.getElementById('filtro-estado')?.value;
  const busquedaFiltro = document.getElementById('filtro-busqueda')?.value.toLowerCase() || '';
  
  return citasData.filter(cita => {
    if (fechaFiltro && cita.fecha !== fechaFiltro) return false;
    if (barberoFiltro && cita.barbero !== barberoFiltro) return false;
    if (estadoFiltro && cita.estado !== estadoFiltro) return false;
    
    if (busquedaFiltro) {
      const clienteMatch = (cita.cliente || '').toLowerCase().includes(busquedaFiltro);
      const servicioMatch = (cita.servicio || '').toLowerCase().includes(busquedaFiltro);
      if (!clienteMatch && !servicioMatch) return false;
    }
    
    return true;
  });
}

function actualizarVistaCitas() {
  const citasFiltradas = getCitasFiltradas();
  
  if (citaVistaActual === 'dia') {
    renderizarVistaDiaria(citasFiltradas);
  } else {
    renderizarVistaSemanal(citasFiltradas);
  }
  
  renderizarTablaCitas(citasFiltradas);
}

function renderizarVistaDiaria(citas) {
  const container = document.getElementById('timeline-citas');
  const fechaSeleccionada = document.getElementById('filtro-fecha')?.value || new Date().toISOString().split('T')[0];
  
  const citasDelDia = citas.filter(c => c.fecha === fechaSeleccionada);
  
  let html = '';
  for (let hora = 8; hora <= 20; hora++) {
    const horaStr = `${hora.toString().padStart(2, '0')}:00`;
    const citasEnHora = citasDelDia.filter(c => {
      const horaCita = parseInt(c.hora.split(':')[0]);
      return horaCita === hora;
    });
    
    const tieneCitas = citasEnHora.length > 0;
    
    html += `
      <div class="hora-slot ${tieneCitas ? 'con-citas' : 'sin-citas'}">
        <div class="hora-label">${horaStr}</div>
        <div class="hora-content">
          ${citasEnHora.map(cita => {
            const estado = cita.estado || 'pendiente';
            const estadoTexto = estado.charAt(0).toUpperCase() + estado.slice(1);
            
            return `
              <div class="cita-card ${estado}" onclick="editarCita('${cita.id}')">
                <div class="cita-card-header">
                  <span class="cita-card-cliente">${cita.cliente}</span>
                  <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <span class="cita-card-estado">${estadoTexto}</span>
                    <span class="cita-card-hora">${cita.hora}</span>
                  </div>
                </div>
                <div class="cita-card-servicio">✂️ ${cita.servicio}</div>
                <div class="cita-card-barbero">💈 ${cita.barbero}</div>
                <div class="cita-card-actions">
                  <button class="btn-cita-action" onclick="event.stopPropagation(); editarCita('${cita.id}')" title="Editar">✏️</button>
                  <button class="btn-cita-action" onclick="event.stopPropagation(); cambiarEstadoCita('${cita.id}', 'confirmada')" title="Confirmar">✅</button>
                  <button class="btn-cita-action" onclick="event.stopPropagation(); cambiarEstadoCita('${cita.id}', 'completada')" title="Completar">✔️</button>
                  <button class="btn-cita-action" onclick="event.stopPropagation(); cambiarEstadoCita('${cita.id}', 'cancelada')" title="Cancelar">❌</button>
                </div>
              </div>
            `;
          }).join('')}
          ${!tieneCitas ? '<div style="color: #bdc3c7; font-size: 0.85rem; padding: 10px;">Sin citas</div>' : ''}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

async function cambiarEstadoCita(citaId, nuevoEstado) {
  try {
    const cita = citasData.find(c => c.id === citaId);
    if (!cita) {
      mostrarToast('❌ Cita no encontrada', 'error');
      return;
    }
    
    if (typeof db !== 'undefined' && negocioId) {
      await db.ref(`negocios/${negocioId}/citas/${citaId}`).update({
        estado: nuevoEstado,
        actualizadoEn: Date.now()
      });
    }
    
    mostrarToast(`✅ Cita marcada como ${nuevoEstado}`, 'success');
    await cargarCitas();
    
  } catch (error) {
    console.error('Error cambiando estado:', error);
    mostrarToast('❌ Error al cambiar estado', 'error');
  }
}

function renderizarVistaSemanal(citas) {
  const container = document.getElementById('calendario-semanal');
  const hoy = new Date();
  
  const diaSemana = hoy.getDay() || 7;
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - diaSemana + 1);
  
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  let html = '<div class="calendario-semanal-header">';
  html += '<div class="dia-header"><div class="dia-nombre">Semana</div></div>';
  
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(inicioSemana);
    fecha.setDate(inicioSemana.getDate() + i);
    const esHoy = fecha.toDateString() === hoy.toDateString();
    
    html += `
      <div class="dia-header ${esHoy ? 'hoy' : ''}">
        <div class="dia-nombre">${dias[i]}</div>
        <div class="dia-fecha">${fecha.getDate()}</div>
      </div>
    `;
  }
  html += '</div>';
  
  html += '<div class="calendario-semanal-body">';
  
  for (let hora = 8; hora <= 18; hora++) {
    const horaStr = `${hora.toString().padStart(2, '0')}:00`;
    
    html += `<div class="hora-columna">${horaStr}</div>`;
    
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(inicioSemana);
      fecha.setDate(inicioSemana.getDate() + i);
      const fechaStr = fecha.toISOString().split('T')[0];
      
      const citasEnHora = citas.filter(c => 
        c.fecha === fechaStr && c.hora.startsWith(`${hora.toString().padStart(2, '0')}`)
      );
      
      html += `
        <div class="dia-celdas" onclick="abrirModalCitaConFecha('${fechaStr}', '${horaStr}')">
          ${citasEnHora.map(cita => `
            <div class="cita-mini ${cita.estado}" onclick="event.stopPropagation(); editarCita('${cita.id}')" title="${cita.cliente} - ${cita.servicio}">
              ${cita.hora} ${cita.cliente}
            </div>
          `).join('')}
        </div>
      `;
    }
  }
  
  html += '</div>';
  container.innerHTML = html;
}

function renderizarTablaCitas(citas) {
  const tbody = document.getElementById('tabla-citas');
  
  if (citas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 40px; color: #95a5a6;">
          <div style="font-size: 3rem; margin-bottom: 15px;">📅</div>
          <p>No hay citas que mostrar</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = citas.map(cita => {
    const estado = cita.estado || 'pendiente';
    const estadoTexto = estado.charAt(0).toUpperCase() + estado.slice(1);
    
    return `
      <tr>
        <td><strong>${cita.fecha}</strong><br><small style="color: #7f8c8d;">${cita.hora}</small></td>
        <td><strong>${cita.cliente}</strong><br><small style="color: #7f8c8d;">${cita.telefono || ''}</small></td>
        <td>${cita.servicio}</td>
        <td>${cita.barbero}</td>
        <td>${cita.duracion} min</td>
        <td><strong>$${parseFloat(cita.precio || 0).toLocaleString()}</strong></td>
        <td><span class="cita-status ${estado}">${estadoTexto}</span></td>
        <td>
          <button class="btn-action btn-edit" onclick="editarCita('${cita.id}')" title="Editar">✏️</button>
          <button class="btn-action btn-delete" onclick="eliminarCita('${cita.id}')" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==================== MODAL DE CITAS ====================

async function abrirModalCita(citaId = null) {
  const selectServicio = document.getElementById('cita-servicio');
  const selectBarbero = document.getElementById('cita-barbero');
  
  selectServicio.innerHTML = '<option value="">Cargando servicios...</option>';
  selectBarbero.innerHTML = '<option value="">Cargando barberos...</option>';
  
  document.getElementById('cita-id').value = '';
  document.getElementById('cita-cliente').value = '';
  document.getElementById('cita-telefono').value = '';
  document.getElementById('cita-notas').value = '';
  document.getElementById('cita-duracion').value = '';
  document.getElementById('cita-precio').value = '';
  
  const ahora = new Date();
  document.getElementById('cita-fecha').value = ahora.toISOString().split('T')[0];
  document.getElementById('cita-hora').value = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
  document.getElementById('cita-estado').value = 'pendiente';
  
  if (citaId) {
    document.getElementById('modal-cita-titulo').textContent = 'Editar Cita';
    document.getElementById('cita-id').value = citaId;
    
    await cargarServiciosYBarberosParaCitas();
    
    cargandoDatosCita = true;
    
    await cargarDatosCita(citaId);
    
    setTimeout(() => {
      cargandoDatosCita = false;
    }, 500);
    
  } else {
    document.getElementById('modal-cita-titulo').textContent = 'Nueva Cita';
    
    await cargarServiciosYBarberosParaCitas();
  }
  
  document.getElementById('modal-cita').classList.add('show');
}

function abrirModalCitaConFecha(fecha, hora) {
  abrirModalCita().then(() => {
    document.getElementById('cita-fecha').value = fecha;
    document.getElementById('cita-hora').value = hora;
  });
}

function cerrarModalCita() {
  document.getElementById('modal-cita').classList.remove('show');
  cargandoDatosCita = false;
}

async function cargarServiciosYBarberosParaCitas() {
  const selectServicio = document.getElementById('cita-servicio');
  const selectBarbero = document.getElementById('cita-barbero');
  
  if (!selectServicio || !selectBarbero) {
    console.warn('⚠️ Selects no encontrados en el DOM');
    return;
  }
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      const serviciosSnapshot = await db.ref(`negocios/${negocioId}/servicios`).once('value');
      serviciosData = [];
      
      if (serviciosSnapshot.exists()) {
        serviciosSnapshot.forEach(child => {
          serviciosData.push({ id: child.key, ...child.val() });
        });
      }
      
      console.log('✅ Servicios cargados:', serviciosData.length);
      
      selectServicio.innerHTML = '<option value="">Seleccione un servicio...</option>';
      serviciosData.forEach(servicio => {
        if (servicio.estado === 'activo' || !servicio.estado) {
          const opcion = document.createElement('option');
          opcion.value = servicio.id;
          opcion.dataset.nombre = servicio.nombre;
          opcion.dataset.duracion = servicio.duracion || 30;
          opcion.dataset.precio = servicio.precio || 0;
          opcion.textContent = `${servicio.icono || '✂️'} ${servicio.nombre} - $${parseFloat(servicio.precio || 0).toLocaleString()} (${servicio.duracion} min)`;
          selectServicio.appendChild(opcion);
        }
      });
      
      const barberosSnapshot = await db.ref(`negocios/${negocioId}/barberos`).once('value');
      barberosData = [];
      
      if (barberosSnapshot.exists()) {
        barberosSnapshot.forEach(child => {
          barberosData.push({ id: child.key, ...child.val() });
        });
      }
      
      console.log('✅ Barberos cargados:', barberosData.length);
      
      selectBarbero.innerHTML = '<option value="">Seleccione un barbero...</option>';
      barberosData.forEach(barbero => {
        if (barbero.estado === 'activo' || !barbero.estado) {
          const opcion = document.createElement('option');
          opcion.value = barbero.nombre;
          opcion.textContent = `${barbero.nombre}${barbero.especialidad ? ' - ' + barbero.especialidad : ''}`;
          selectBarbero.appendChild(opcion);
        }
      });
      
    } else {
      serviciosData = [
        { id: '1', nombre: 'Corte de Cabello', duracion: 30, precio: 15000, icono: '✂️', estado: 'activo' },
        { id: '2', nombre: 'Arreglo de Barba', duracion: 20, precio: 10000, icono: '🧔', estado: 'activo' },
        { id: '3', nombre: 'Corte + Barba', duracion: 45, precio: 22000, icono: '💈', estado: 'activo' }
      ];
      
      barberosData = [
        { id: '1', nombre: 'Juan Pérez', especialidad: 'Cortes', estado: 'activo' },
        { id: '2', nombre: 'Pedro Gómez', especialidad: 'Barbas', estado: 'activo' },
        { id: '3', nombre: 'Carlos Ruiz', especialidad: 'Ambos', estado: 'activo' }
      ];
      
      selectServicio.innerHTML = '<option value="">Seleccione un servicio...</option>';
      serviciosData.forEach(servicio => {
        const opcion = document.createElement('option');
        opcion.value = servicio.id;
        opcion.dataset.nombre = servicio.nombre;
        opcion.dataset.duracion = servicio.duracion;
        opcion.dataset.precio = servicio.precio;
        opcion.textContent = `${servicio.icono} ${servicio.nombre} - $${servicio.precio.toLocaleString()} (${servicio.duracion} min)`;
        selectServicio.appendChild(opcion);
      });
      
      selectBarbero.innerHTML = '<option value="">Seleccione un barbero...</option>';
      barberosData.forEach(barbero => {
        const opcion = document.createElement('option');
        opcion.value = barbero.nombre;
        opcion.textContent = `${barbero.nombre} - ${barbero.especialidad}`;
        selectBarbero.appendChild(opcion);
      });
    }
  } catch (error) {
    console.error('❌ Error cargando servicios y barberos:', error);
    mostrarToast('⚠️ Error al cargar datos', 'error');
  }
}

async function cargarDatosCita(citaId) {
  console.log('📝 Cargando datos de cita:', citaId);
  
  try {
    let cita = citasData.find(c => c.id === citaId);
    
    if (!cita && typeof db !== 'undefined' && negocioId) {
      const snapshot = await db.ref(`negocios/${negocioId}/citas/${citaId}`).once('value');
      if (snapshot.exists()) {
        cita = { id: citaId, ...snapshot.val() };
      }
    }
    
    if (!cita) {
      console.error('❌ Cita no encontrada:', citaId);
      mostrarToast('❌ Cita no encontrada', 'error');
      return;
    }
    
    console.log('📦 Datos de la cita:', cita);
    
    document.getElementById('cita-id').value = citaId;
    document.getElementById('cita-fecha').value = cita.fecha || '';
    document.getElementById('cita-hora').value = cita.hora || '';
    document.getElementById('cita-cliente').value = cita.cliente || '';
    document.getElementById('cita-telefono').value = cita.telefono || '';
    document.getElementById('cita-estado').value = cita.estado || 'pendiente';
    document.getElementById('cita-notas').value = cita.notas || '';
    document.getElementById('cita-duracion').value = cita.duracion || 30;
    document.getElementById('cita-precio').value = cita.precio || 0;
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const selectBarbero = document.getElementById('cita-barbero');
    const barberoNombre = cita.barbero || '';
    
    if (barberoNombre && selectBarbero) {
      let barberoEncontrado = false;
      
      for (let i = 0; i < selectBarbero.options.length; i++) {
        if (selectBarbero.options[i].value === barberoNombre) {
          selectBarbero.selectedIndex = i;
          barberoEncontrado = true;
          console.log('✅ Barbero seleccionado:', barberoNombre);
          break;
        }
      }
      
      if (!barberoEncontrado) {
        console.warn('⚠️ Barbero no encontrado, agregando:', barberoNombre);
        const nuevaOpcion = new Option(barberoNombre, barberoNombre);
        nuevaOpcion.selected = true;
        selectBarbero.add(nuevaOpcion);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const selectServicio = document.getElementById('cita-servicio');
    const servicioId = cita.servicioId || '';
    const servicioNombre = cita.servicio || '';
    
    if (selectServicio) {
      let servicioSeleccionado = false;
      
      if (servicioId) {
        for (let i = 0; i < selectServicio.options.length; i++) {
          if (selectServicio.options[i].value === servicioId) {
            selectServicio.selectedIndex = i;
            servicioSeleccionado = true;
            console.log('✅ Servicio seleccionado por ID:', servicioId);
            break;
          }
        }
      }
      
      if (!servicioSeleccionado && servicioNombre) {
        for (let i = 0; i < selectServicio.options.length; i++) {
          const dataNombre = selectServicio.options[i].dataset.nombre;
          if (dataNombre === servicioNombre) {
            selectServicio.selectedIndex = i;
            servicioSeleccionado = true;
            console.log('✅ Servicio seleccionado por nombre:', servicioNombre);
            break;
          }
        }
      }
      
      if (!servicioSeleccionado && servicioNombre) {
        console.warn('⚠️ Servicio no encontrado, agregando:', servicioNombre);
        const nuevaOpcion = new Option(
          `${servicioNombre} - $${parseFloat(cita.precio || 0).toLocaleString()} (${cita.duracion || 30} min)`,
          'custom-' + Date.now()
        );
        nuevaOpcion.dataset.nombre = servicioNombre;
        nuevaOpcion.dataset.duracion = cita.duracion || 30;
        nuevaOpcion.dataset.precio = cita.precio || 0;
        nuevaOpcion.selected = true;
        selectServicio.add(nuevaOpcion);
      }
    }
    
    console.log('✅ Cita cargada correctamente en el formulario');
    
  } catch (error) {
    console.error('❌ Error cargando datos de cita:', error);
    mostrarToast('❌ Error al cargar la cita', 'error');
  }
}

function actualizarDuracionYPrecio() {
  if (cargandoDatosCita) {
    return;
  }
  
  const selectServicio = document.getElementById('cita-servicio');
  if (selectServicio && selectServicio.selectedIndex > 0) {
    const opcion = selectServicio.options[selectServicio.selectedIndex];
    document.getElementById('cita-duracion').value = opcion.dataset.duracion || 30;
    document.getElementById('cita-precio').value = opcion.dataset.precio || 0;
  } else {
    document.getElementById('cita-duracion').value = '';
    document.getElementById('cita-precio').value = '';
  }
}

async function guardarCita() {
  const id = document.getElementById('cita-id').value;
  const selectServicio = document.getElementById('cita-servicio');
  const selectBarbero = document.getElementById('cita-barbero');
  
  let servicioNombre = '';
  let servicioId = selectServicio.value;
  
  if (selectServicio.selectedIndex > 0) {
    const opcionSeleccionada = selectServicio.options[selectServicio.selectedIndex];
    servicioNombre = opcionSeleccionada.dataset.nombre || '';
    
    if (!servicioNombre) {
      servicioNombre = opcionSeleccionada.text.split(' -')[0].replace(/^[^\s]+\s/, '').trim();
    }
  }
  
  const citaData = {
    fecha: document.getElementById('cita-fecha').value,
    hora: document.getElementById('cita-hora').value,
    cliente: document.getElementById('cita-cliente').value.trim(),
    telefono: document.getElementById('cita-telefono').value.trim(),
    servicio: servicioNombre,
    servicioId: servicioId.startsWith('custom-') ? null : servicioId,
    barbero: selectBarbero.value,
    duracion: parseInt(document.getElementById('cita-duracion').value) || 30,
    precio: parseFloat(document.getElementById('cita-precio').value) || 0,
    estado: document.getElementById('cita-estado').value,
    notas: document.getElementById('cita-notas').value.trim(),
    actualizadoEn: Date.now()
  };
  
  console.log('💾 Datos a guardar:', citaData);
  
  const errores = [];
  if (!citaData.fecha) errores.push('Fecha');
  if (!citaData.hora) errores.push('Hora');
  if (!citaData.cliente) errores.push('Cliente');
  if (!citaData.barbero) errores.push('Barbero');
  if (!citaData.servicio) errores.push('Servicio');
  
  if (errores.length > 0) {
    mostrarToast(`❌ Complete los campos: ${errores.join(', ')}`, 'error');
    return;
  }
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      if (id) {
        await db.ref(`negocios/${negocioId}/citas/${id}`).update(citaData);
        mostrarToast('✅ Cita actualizada correctamente', 'success');
      } else {
        citaData.creadoEn = Date.now();
        await db.ref(`negocios/${negocioId}/citas`).push(citaData);
        mostrarToast('✅ Cita creada correctamente', 'success');
      }
    } else {
      console.log('Cita guardada (modo demo):', citaData);
      mostrarToast('✅ Cita guardada (modo demo)', 'success');
    }
    
    cerrarModalCita();
    await cargarCitas();
    
  } catch (error) {
    console.error('❌ Error guardando cita:', error);
    mostrarToast('❌ Error al guardar la cita: ' + error.message, 'error');
  }
}

function editarCita(citaId) {
  abrirModalCita(citaId);
}

async function eliminarCita(citaId) {
  if (!confirm('¿Está seguro de eliminar esta cita?')) return;
  
  try {
    if (typeof db !== 'undefined' && negocioId) {
      await db.ref(`negocios/${negocioId}/citas/${citaId}`).remove();
      mostrarToast('✅ Cita eliminada correctamente', 'success');
      await cargarCitas();
    } else {
      mostrarToast('✅ Cita eliminada (modo demo)', 'success');
    }
  } catch (error) {
    console.error('Error eliminando cita:', error);
    mostrarToast('❌ Error al eliminar la cita', 'error');
  }
}