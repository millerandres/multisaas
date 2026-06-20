// modules/mesas.js - Gestión visual de mesas para restaurantes

import { ModuleEngine } from './module_engine.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class MesasModule extends ModuleEngine {
  constructor(config) {
    super({
      id: 'mesas',
      nombre: 'Mesas',
      icono: '🪑',
      campos_base: ['numero', 'capacidad', 'zona'],
      estados: ['libre', 'ocupada', 'reservada', 'sucia'],
      ruta_db: 'negocios/{negocioId}/mesas',
      permisos: { crear: true, editar: true, eliminar: true }
    });
  }

  // Sobrescribimos el render para que sea una cuadrícula visual
  render() {
    const container = document.getElementById(`module-${this.config.id}`);
    if (!container) return;

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>${this.config.icono} ${this.config.nombre}</h4>
        <button class="btn btn-primary" id="btn-add-mesa">
          <i class="bi bi-plus-circle me-2"></i>Nueva Mesa
        </button>
      </div>
      
      <!-- Leyenda de colores -->
      <div class="mb-4 d-flex gap-3">
        <span class="badge bg-success p-2">Libre</span>
        <span class="badge bg-danger p-2">Ocupada</span>
        <span class="badge bg-warning text-dark p-2">Reservada</span>
        <span class="badge bg-secondary p-2">Sucia</span>
      </div>

      <div id="${this.config.id}-grid" class="row g-3">
        <div class="col-12 text-center loading">Cargando mesas...</div>
      </div>
    `;

    this.bindEvents();
    this.load();
  }

  bindEvents() {
    document.getElementById('btn-add-mesa')?.addEventListener('click', () => this.openForm());
    
    // Delegación de eventos para las mesas
    document.getElementById(`${this.config.id}-grid`)?.addEventListener('click', (e) => {
      const mesaCard = e.target.closest('.mesa-card');
      if (!mesaCard) return;
      
      const mesaId = mesaCard.dataset.id;
      const action = e.target.dataset.action;

      if (action === 'edit') this.openForm(mesaId);
      if (action === 'delete') this.delete(mesaId);
      if (action === 'changeStatus') this.toggleStatus(mesaId);
    });
  }

  async load() {
    const gridEl = document.getElementById(`${this.config.id}-grid`);
    gridEl.innerHTML = '<div class="col-12 loading">Cargando...</div>';

    try {
      const items = await FirebaseHelpers.list({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        orderBy: 'numero', // Ordenar por número de mesa
        order: 'asc'
      });

      this.renderGrid(items);
    } catch (err) {
      gridEl.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  }

  renderGrid(items) {
    const gridEl = document.getElementById(`${this.config.id}-grid`);
    
    if (!items.length) {
      gridEl.innerHTML = '<div class="col-12 text-center text-muted py-5">No hay mesas registradas</div>';
      return;
    }

    gridEl.innerHTML = items.map(item => {
      // Colores según estado
      const colors = {
        libre: 'success',
        ocupada: 'danger',
        reservada: 'warning',
        sucia: 'secondary'
      };
      const color = colors[item.estado] || 'primary';
      
      return `
        <div class="col-6 col-md-4 col-lg-3">
          <div class="card mesa-card border-${color} h-100" data-id="${item.id}" style="cursor: pointer;">
            <div class="card-body text-center">
              <h1 class="display-4 mb-2">${item.numero || '?'}</h1>
              <span class="badge bg-${color} mb-2">${item.estado || 'libre'}</span>
              <div class="small text-muted">Cap: ${item.capacidad || 4} personas</div>
              <div class="mt-3 d-flex justify-content-center gap-2">
                <button class="btn btn-sm btn-outline-${color}" data-action="changeStatus" title="Cambiar Estado">🔄</button>
                <button class="btn btn-sm btn-outline-primary" data-action="edit" title="Editar">✏️</button>
                <button class="btn btn-sm btn-outline-danger" data-action="delete" title="Eliminar">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async toggleStatus(id) {
    const estados = ['libre', 'ocupada', 'reservada', 'sucia'];
    const snap = await FirebaseHelpers.ref(this.config.ruta_db, this.negocioId).child(id).once('value');
    const current = snap.val();
    
    // Ciclo simple de estados
    const currentIndex = estados.indexOf(current.estado);
    const nextStatus = estados[(currentIndex + 1) % estados.length];
    
    await FirebaseHelpers.update({
      path: this.config.ruta_db,
      negocioId: this.negocioId,
      id: id,
      data: { estado: nextStatus }
    });
    this.load();
  }
}