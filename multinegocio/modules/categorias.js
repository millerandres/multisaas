// modules/categorias.js - Categorías de productos/servicios

import { ModuleEngine } from './module_engine.js';
import { Formatters } from '../utils/formatters.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class CategoriasModule extends ModuleEngine {
  constructor(config) {
    super({
      id: 'categorias',
      nombre: 'Categorías',
      icono: '📂',
      label_boton_nuevo: 'Nueva Categoría',
      campos_base: ['nombre', 'descripcion', 'imagen'],
      campos_extra: config.campos_extra || [],
      estados: ['activo', 'inactivo'],
      ruta_db: 'negocios/{negocioId}/menu',
      permisos: { crear: true, editar: true, eliminar: true },
      ...config
    });
  }

  getTableColumns() {
    return [
      { key: 'imagen', label: '', width: '15%' },
      { key: 'nombre', label: 'Nombre', width: '45%' },
      { key: 'descripcion', label: 'Descripción', width: '30%' },
      { key: 'estado', label: 'Estado', format: 'badge', width: '10%' }
    ];
  }

  getTableActions() {
    return [
      { label: 'Editar', icon: '✏️', variant: 'outline-primary', action: 'edit', size: 'sm' },
      { label: 'Eliminar', icon: '🗑️', variant: 'outline-danger', action: 'delete', size: 'sm' }
    ];
  }

  static getDefaultImage(nombre) {
    const inicial = nombre ? nombre.charAt(0).toUpperCase() : 'C';
    const colors = [
      { bg: '#667eea', text: '#ffffff' },
      { bg: '#f093fb', text: '#ffffff' },
      { bg: '#4facfe', text: '#ffffff' },
      { bg: '#43e97b', text: '#ffffff' },
      { bg: '#fa709a', text: '#ffffff' },
      { bg: '#fee140', text: '#ffffff' }
    ];
    const color = colors[nombre ? nombre.length % colors.length : 0];
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color.bg};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${color.bg}dd;stop-opacity:1"/>
      </linearGradient></defs>
      <rect width="120" height="120" fill="url(#grad)" rx="12"/>
      <text x="50%" y="50%" font-family="Arial" font-size="48" font-weight="bold" 
            fill="${color.text}" text-anchor="middle" dominant-baseline="central">${inicial}</text>
    </svg>`;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  renderItem(item) {
    const defaultImage = this.constructor.getDefaultImage(item.nombre);
    const hasImage = item.imagen && item.imagen.trim() !== '';
    
    return `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <div class="categoria-imagen-container">
              <img src="${hasImage ? item.imagen : defaultImage}" 
                   alt="${item.nombre}" 
                   class="categoria-imagen"
                   onerror="this.src='${defaultImage}'">
            </div>
            <div>
              <strong class="fs-5">${item.nombre || 'Sin nombre'}</strong>
              <div class="text-muted small">${item.descripcion || 'Sin descripción'}</div>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="window.editarCategoria('${item.id}')" title="Editar">
              <i class="bi bi-pencil-fill"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.eliminarCategoria('${item.id}', '${item.nombre}')" title="Eliminar">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ✅ MÉTODO LOAD PARA MOSTRAR CATEGORÍAS
  // ✅ MÉTODO LOAD PARA MOSTRAR CATEGORÍAS
async load() {
  console.log('🔄 Cargando categorías para negocio:', this.negocioId);
  
  const listEl = document.getElementById('lista-categorias');
  if (!listEl) {
    console.error('❌ Elemento lista-categorias no encontrado en el DOM');
    console.log('Elementos disponibles:', document.querySelectorAll('[id]'));
    return;
  }
  
  listEl.innerHTML = '<div class="loading">Cargando categorías...</div>';
  
  try {
    if (!this.negocioId) {
      throw new Error('negocioId no está definido');
    }
    
    const snapshot = await window.db.ref(`negocios/${this.negocioId}/menu`).once('value');
    const menu = snapshot.val() || {};
    
    console.log('📦 Datos recibidos de Firebase:', menu);
    
    const categorias = Object.entries(menu).map(([id, data]) => ({ id, ...data }));
    
    if (categorias.length === 0) {
      listEl.innerHTML = '<p class="text-center text-muted py-4">No hay categorías registradas<br><small class="text-muted">Haz clic en "Nueva Categoría" para comenzar</small></p>';
      return;
    }
    
    // Ordenar por nombre
    categorias.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    
    console.log('✅ Categorías cargadas:', categorias.length);
    listEl.innerHTML = categorias.map(cat => this.renderItem(cat)).join('');
    
  } catch (err) {
    console.error('❌ Error cargando categorías:', err);
    listEl.innerHTML = `<div class="alert alert-danger">Error al cargar: ${err.message}</div>`;
  }
}

  // ✅ MÉTODO SAVE PARA GUARDAR/ACTUALIZAR
  async save() {
    try {
      const nombreInput = document.getElementById('catNombre');
      const descInput = document.getElementById('catDescripcion');
      const imagenInput = document.getElementById('catImagen');
      const form = document.getElementById('formCategoria');
      
      if (!nombreInput) {
        throw new Error('No se encontró el campo de nombre');
      }
      
      const nombre = nombreInput.value.trim();
      const descripcion = descInput ? descInput.value.trim() : '';
      const editId = form ? form.dataset.editId : null;
      
      if (!nombre) {
        window.showToast('El nombre es obligatorio', 'error');
        return;
      }
      
      const btn = document.getElementById('btnGuardarCategoria');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';
      }
      
      const data = {
        nombre: nombre,
        descripcion: descripcion,
        icono: '📦',
        productos: {},
        activo: true,
        actualizadoEn: Date.now()
      };
      
      // Subir imagen si existe
      if (imagenInput && imagenInput.files && imagenInput.files[0]) {
        const file = imagenInput.files[0];
        const fileName = `categorias/${this.negocioId}/${Date.now()}_${file.name}`;
        const storageRef = window.storage.ref(fileName);
        await storageRef.put(file);
        data.imagen = await storageRef.getDownloadURL();
      }
      
      if (editId) {
        // Actualizar existente
        await window.db.ref(`negocios/${this.negocioId}/menu/${editId}`).update(data);
      } else {
        // Crear nuevo
        const idUnico = Date.now().toString(36) + Math.random().toString(36).substr(2);
        data.creadoEn = Date.now();
        await window.db.ref(`negocios/${this.negocioId}/menu/${idUnico}`).set(data);
      }
      
      // Cerrar modal
      const modalEl = document.getElementById('modalCategoria');
      if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        
        setTimeout(() => {
          modalEl.classList.remove('show');
          modalEl.style.display = 'none';
          document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
          document.body.classList.remove('modal-open');
        }, 150);
      }
      
      // Limpiar y recargar
      setTimeout(() => {
        if (window.limpiarFormularioCategoria) {
          window.limpiarFormularioCategoria();
        }
        this.load();
        window.showToast(editId ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente', 'success');
      }, 200);
      
    } catch (err) {
      console.error('Error guardando:', err);
      window.showToast('Error: ' + err.message, 'error');
    } finally {
      const btn = document.getElementById('btnGuardarCategoria');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save-fill"></i> Guardar Categoría';
      }
    }
  }

  // ✅ MÉTODO PARA EDITAR CATEGORÍA
  async editarCategoria(id) {
    try {
      const snapshot = await window.db.ref(`negocios/${this.negocioId}/menu/${id}`).once('value');
      const categoria = snapshot.val();
      
      if (!categoria) {
        window.showToast('Categoría no encontrada', 'error');
        return;
      }
      
      // Llenar formulario
      const nombreInput = document.getElementById('catNombre');
      const descInput = document.getElementById('catDescripcion');
      
      if (nombreInput) nombreInput.value = categoria.nombre || '';
      if (descInput) descInput.value = categoria.descripcion || '';
      
      // Mostrar imagen si existe
      if (categoria.imagen) {
        const preview = document.getElementById('preview-categoria');
        const img = document.getElementById('preview-categoria-img');
        if (preview && img) {
          img.src = categoria.imagen;
          preview.style.display = 'block';
        }
      }
      
      // Abrir modal
      const modalEl = document.getElementById('modalCategoria');
      if (modalEl) {
        const modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();
        
        // Guardar ID
        const form = document.getElementById('formCategoria');
        if (form) form.dataset.editId = id;
        
        // Cambiar título
        const tituloEl = document.getElementById('modalCategoriaTitulo');
        if (tituloEl) tituloEl.textContent = 'Editar Categoría';
      }
      
    } catch (err) {
      console.error('Error editando:', err);
      window.showToast('Error: ' + err.message, 'error');
    }
  }

  // ✅ MÉTODO PARA ELIMINAR CATEGORÍA
  async eliminarCategoria(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;
    
    try {
      await window.db.ref(`negocios/${this.negocioId}/menu/${id}`).remove();
      window.showToast('Categoría eliminada correctamente', 'success');
      this.load();
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  }
}