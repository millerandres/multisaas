// modules/comandas.js - Vista Cocina / Comandas

import { ModuleEngine } from './module_engine.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class ComandasModule extends ModuleEngine {
  constructor(config) {
    super({
      id: 'comandas',
      nombre: 'Cocina / Comandas',
      icono: '👨‍🍳',
      ruta_db: 'negocios/{negocioId}/pedidos'
    });
  }

  render() {
    const container = document.getElementById(`module-${this.config.id}`);
    if (!container) return;

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>${this.config.icono} ${this.config.nombre}</h4>
        <button class="btn btn-outline-secondary" onclick="window.showTab('pedidos')">Ver Gestión Completa</button>
      </div>
      <div id="${this.config.id}-board" class="row g-3">
        <div class="col-12 loading">Cargando comandas...</div>
      </div>
    `;
    this.load();
  }

  async load() {
    const boardEl = document.getElementById(`${this.config.id}-board`);
    try {
      // Cargar pedidos pendientes o en preparación
      const items = await FirebaseHelpers.list({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        orderBy: 'creadoEn',
        order: 'asc'
      });

      // Filtrar solo los activos (no entregados ni cancelados)
      const activeOrders = items.filter(p => !['entregado', 'cancelado'].includes(p.estado));
      
      if (!activeOrders.length) {
        boardEl.innerHTML = '<div class="col-12 text-center text-muted py-5">🎉 No hay pedidos pendientes en cocina</div>';
        return;
      }

      boardEl.innerHTML = activeOrders.map(pedido => {
        const itemsList = (pedido.productos || []).map(prod => 
          `<li>${prod.qty}x ${prod.nombre} <small class="text-muted">${prod.notas || ''}</small></li>`
        ).join('');

        return `
          <div class="col-md-6 col-lg-4">
            <div class="card border-start border-4 border-warning h-100">
              <div class="card-header d-flex justify-content-between bg-light">
                <strong>#${pedido.id.substr(0, 6)}</strong>
                <span class="badge bg-secondary">${new Date(pedido.creadoEn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div class="card-body">
                <h5 class="card-title">Mesa: ${pedido.numero_mesa || 'N/A'}</h5>
                <p class="card-text small text-muted">Cliente: ${pedido.cliente || 'Anónimo'}</p>
                <ul class="list-group list-group-flush mb-3">
                  ${itemsList}
                </ul>
                ${pedido.notas ? `<div class="alert alert-warning py-1 small">⚠️ ${pedido.notas}</div>` : ''}
              </div>
              <div class="card-footer bg-white">
                <button class="btn btn-success w-100" onclick="window.marcarComandaListo('${pedido.id}')">
                  ✅ Marcar como Listo
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      boardEl.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
  }
}

// Función global para marcar listo desde el HTML generado dinámicamente
window.marcarComandaListo = async function(pedidoId) {
  try {
    await window.db.ref(`negocios/${window.currentNegocioId}/pedidos/${pedidoId}`).update({ estado: 'listo' });
    // Recargar el módulo actual
    window.modules.comandas?.load();
    // Opcional: Recargar dashboard
    window.modules.dashboard?.loadRecentItems();
  } catch (e) {
    alert('Error al actualizar: ' + e.message);
  }
};