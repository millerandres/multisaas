// modules/module_engine.js - Motor genérico para módulos CRUD

import { UITable } from '../components/ui_table.js';
import { UIFilters } from '../components/ui_filters.js';
import { UIModalForm } from '../components/ui_modal_form.js';
import { Formatters } from '../utils/formatters.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class ModuleEngine {
  constructor(config) {
    this.config = {
      id: config.id,
      nombre: config.nombre,
      icono: config.icono || '📦',
      campos_base: config.campos_base || ['nombre', 'descripcion', 'activo'],
      campos_extra: config.campos_extra || [],
      estados: config.estados || ['activo', 'inactivo'],
      ruta_db: config.ruta_db,
      permisos: config.permisos || { crear: true, editar: true, eliminar: true },
      orden_por_defecto: config.orden_por_defecto || 'creadoEn',
      ...config
    };
    this.negocioId = null;
    this.currentFilters = {};
    this.items = [];
  }

init(negocioId, configOverride = {}) {
  this.negocioId = negocioId;
  this.config = { ...this.config, ...configOverride };
  
  // CORRECCIÓN: Limpiar listeners y modales antes de re-inicializar
  this.cleanup();
  
  this.render();
  this.bindEvents();
  this.load();
}

// CORRECCIÓN: Agregar método cleanup()
cleanup() {
  // Destruir modal si existe
  const modalId = `modal-${this.config.id}`;
  UIModalForm.destroy(modalId);
  
  // Limpiar event listeners (si los guardaste, sino Bootstrap lo hace)
  // Aquí podrías guardar referencias a listeners para removerlos
}

  render() {
    const container = document.getElementById(`module-${this.config.id}`);
    if (!container) return;

    const headerHtml = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>${this.config.icono} ${this.config.nombre}</h4>
        ${this.config.permisos.crear ? 
          `<button class="btn btn-primary" id="btn-create-${this.config.id}">
            <i class="bi bi-plus-circle me-2"></i>${this.config.label_boton_nuevo || 'Nuevo ' + this.config.nombre.slice(0, -1)}
          </button>` : ''}
      </div>
    `;

    const filtersConfig = {
      showSearch: true,
      showSort: true,
      showRefresh: true,
      filters: this.getFiltersConfig()
    };
    const filtersHtml = UIFilters.create(filtersConfig);

    const listHtml = `
      <div class="card">
        <div class="card-body">
          <div id="${this.config.id}-list">
            <div class="loading">Cargando...</div>
          </div>
        </div>
      </div>
    `;

    const modalHtml = UIModalForm.create({
      id: `modal-${this.config.id}`,
      title: `${this.config.icono} ${this.config.nombre.slice(0, -1)}`,
      fields: this.getFormFields(),
      size: 'lg',
      static: false
    });

    container.innerHTML = headerHtml + filtersHtml + listHtml;
    
    // Eliminar modal anterior del DOM antes de agregar nuevo
    const existingModal = document.getElementById(`modal-${this.config.id}`);
    if (existingModal) {
      UIModalForm.destroy(`modal-${this.config.id}`);
      existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }


  getFiltersConfig() {
    return [];
  }

  getFormFields() {
    const fields = [];
    
    this.config.campos_base.forEach(campo => {
      fields.push(this._campoToField(campo));
    });
    
    this.config.campos_extra.forEach(campo => {
      const field = this._campoToField(campo);
      field.help = 'Campo específico del tipo de negocio';
      fields.push(field);
    });
    
    return fields;
  }

  _campoToField(campo) {
    const label = campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const type = this.getFieldType(campo);
    const required = ['nombre', 'email', 'precio'].includes(campo);
    
    if (type === 'select') {
      return {
        name: campo,
        label: label,
        type: 'select',
        options: this.getSelectOptions(campo),
        required: required
      };
    }
    
    return {
      name: campo,
      label: label,
      type: type,
      required: required,
      width: campo === 'descripcion' ? 'full' : 'half'
    };
  }

  bindEvents() {
    document.getElementById(`btn-create-${this.config.id}`)?.addEventListener('click', () => {
      this.openForm();
    });

    UIFilters.bindEvents('filters-container', (filters) => {
      this.currentFilters = filters;
      this.load();
    });

    document.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
      this.load();
    });

    document.getElementById(`form-modal-${this.config.id}`)?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.save();
    });

    document.getElementById(`${this.config.id}-list`)?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      
      if (action === 'edit' && this.config.permisos.editar) {
        this.openForm(id);
      } else if (action === 'delete' && this.config.permisos.eliminar) {
        this.delete(id);
      }
    });
  }

  async load() {
    const listEl = document.getElementById(`${this.config.id}-list`);
    listEl.innerHTML = '<div class="loading">Cargando...</div>';
    
    try {
      const [orderBy, order] = (this.currentFilters.orden || this.config.orden_por_defecto).split(':');
      
      const items = await FirebaseHelpers.list({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        orderBy,
        order,
        filters: this.currentFilters.search ? { nombre: this.currentFilters.search } : {}
      });
      
      this.items = items;
      this.renderList(items);
      
    } catch (err) {
      listEl.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
      console.error(`Error loading ${this.config.id}:`, err);
    }
  }

  renderList(items) {
    const listEl = document.getElementById(`${this.config.id}-list`);
    
    if (!items || items.length === 0) {
      listEl.innerHTML = '<div class="text-center text-muted py-4">No hay registros</div>';
      return;
    }

    const tableHtml = UITable.create({
      columns: this.getTableColumns(),
      data: items,
      actions: this.getTableActions(),
      renderRow: this.renderItem.bind(this)
    });
    
    listEl.innerHTML = tableHtml;
  }

  getTableColumns() {
    return [
      { key: 'nombre', label: 'Nombre', width: '40%' },
      { key: 'descripcion', label: 'Descripción', width: '40%' }
    ];
  }

  getTableActions() {
    const actions = [];
    
    if (this.config.permisos.editar) {
      actions.push({ 
        label: 'Editar', 
        icon: '✏️', 
        variant: 'outline-primary',
        action: 'edit'
      });
    }
    
    if (this.config.permisos.eliminar) {
      actions.push({ 
        label: 'Eliminar', 
        icon: '🗑️', 
        variant: 'outline-danger',
        action: 'delete'
      });
    }
    
    return actions;
  }

  renderItem(item) {
    return `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.nombre || 'Sin nombre'}</strong>
            <div class="text-muted small">${item.descripcion ? Formatters.truncate(item.descripcion, 60) : ''}</div>
          </div>
          <div>
            ${Formatters.statusBadge(item.estado || 'activo')}
          </div>
        </div>
      </div>
    `;
  }

 openForm(id = null) {
  const modalId = `modal-${this.config.id}`;
  const data = id ? this.getData(id) : {};
  
  // ✅ CERRAR CUALQUIER MODAL ABIERTO ANTES
  document.querySelectorAll('.modal.show').forEach(modalEl => {
    const instance = bootstrap.Modal.getInstance(modalEl);
    if (instance) {
      instance.hide();
      instance.dispose();
    }
  });
  
  // ✅ LIMPIAR BACKDROPS RESIDUALES
  setTimeout(() => {
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    
    // ABRIR NUEVO MODAL
    UIModalForm.open(modalId, data);
    
    const title = `${this.config.icono} ${id ? 'Editar' : 'Nuevo'} ${this.config.nombre.slice(0, -1)}`;
    const titleEl = document.getElementById(`${modalId}-title`);
    if (titleEl) titleEl.textContent = title;
    
    const form = document.getElementById(`form-${modalId}`);
    if (form) form.dataset.editId = id || '';
  }, 150);
}

 async save() {
  const modalId = `modal-${this.config.id}`;
  const form = document.getElementById(`form-${modalId}`);
  const editId = form?.dataset.editId;
  
  if (!form) return;
  
  if (!UIModalForm.validate(modalId)) {
    form.reportValidity();
    return;
  }
  
  const data = UIModalForm.getData(modalId);
  
  try {
    if (editId) {
      await FirebaseHelpers.update({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        id: editId,
        data
      });
    } else {
      await FirebaseHelpers.create({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        data
      });
    }
    
    // ✅ DESTRUIR MODAL
    UIModalForm.destroy(modalId);
    
    // ✅ MOSTRAR TOAST
    setTimeout(() => {
      window.showToast(
        editId ? 'Registro actualizado correctamente' : 'Registro creado correctamente',
        'success'
      );
      this.load();
    }, 200);
    
  } catch (err) {
    window.showToast('Error: ' + err.message, 'error');
    console.error('Save error:', err);
  }
}

 async delete(id) {
  // ✅ USAR TOAST EN LUGAR DE CONFIRM
  if (!confirm('¿Eliminar este registro?')) return;
  
  try {
    await FirebaseHelpers.delete({
      path: this.config.ruta_db,
      negocioId: this.negocioId,
      id
    });
    
    window.showToast('Registro eliminado correctamente', 'success');
    this.load();
  } catch (err) {
    window.showToast('Error: ' + err.message, 'error');
  }
}

  async toggleStatus(id) {
    // Override en módulos específicos
  }

  async getData(id) {
    const snap = await FirebaseHelpers.ref(this.config.ruta_db, this.negocioId).child(id).once('value');
    return { id, ...snap.val() };
  }

  getFieldType(campo) {
    const types = {
      descripcion: 'textarea',
      notas: 'textarea',
      imagen: 'file',
      foto: 'file',
      precio: 'number',
      cantidad: 'number',
      telefono: 'tel',
      email: 'email',
      url: 'url',
      fecha: 'date',
      hora: 'time'
    };
    return types[campo] || 'text';
  }

  getSelectOptions(campo) {
    const options = {
      estado: this.config.estados.map(e => ({ value: e, label: e })),
      categoriaId: [],
      rol: [
        { value: 'admin', label: 'Administrador' },
        { value: 'empleado', label: 'Empleado' },
        { value: 'cajero', label: 'Cajero' }
      ]
    };
    return options[campo] || [];
  }
}