// modules/pedidos.js - VERSIÓN CORREGIDA
import { ModuleEngine } from './module_engine.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';
import { Formatters } from '../utils/formatters.js';

export class PedidosModule extends ModuleEngine {
  constructor(config) {
    super({
      id: 'pedidos',
      nombre: 'Pedidos',
      icono: '🛒',
      ruta_db: 'negocios/{negocioId}/pedidos',
      estados: ['pendiente', 'preparado', 'listo', 'entregado', 'anulado'],
      ...config
    });
    this.listeners = {};
    this.cleanupFunction = null;
  }

  render() {
    const container = document.getElementById(`module-${this.config.id}`);
    if (!container) return;

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>${this.config.icono} ${this.config.nombre}</h4>
        <button class="btn btn-primary" id="btn-nuevo-pedido">
          <i class="bi bi-plus-circle me-2"></i>Nuevo Pedido
        </button>
      </div>

      <div class="row g-3">
        <div class="col-md-4">
          <div class="card h-100" style="border-top: 4px solid #ffc107;">
            <div class="card-header bg-warning bg-opacity-10 d-flex justify-content-between align-items-center">
              <h5 class="mb-0">⏳ Pendientes</h5>
              <span class="badge bg-warning text-dark" id="count-pendientes">0</span>
            </div>
            <div class="card-body p-2" id="pedidos-pendientes" style="max-height: calc(100vh - 250px); overflow-y: auto;">
              <div class="text-center text-muted py-5">Cargando...</div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card h-100" style="border-top: 4px solid #28a745;">
            <div class="card-header bg-success bg-opacity-10 d-flex justify-content-between align-items-center">
              <h5 class="mb-0">✅ Preparados</h5>
              <span class="badge bg-success" id="count-preparados">0</span>
            </div>
            <div class="card-body p-2" id="pedidos-preparados" style="max-height: calc(100vh - 250px); overflow-y: auto;">
              <div class="text-center text-muted py-5">Cargando...</div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card h-100" style="border-top: 4px solid #17a2b8;">
            <div class="card-header bg-info bg-opacity-10 d-flex justify-content-between align-items-center">
              <h5 class="mb-0">📦 Entregados</h5>
              <span class="badge bg-info" id="count-entregados">0</span>
            </div>
            <div class="card-body p-2" id="pedidos-entregados" style="max-height: calc(100vh - 250px); overflow-y: auto;">
              <div class="text-center text-muted py-5">Cargando...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.load();
    this.setupRealTimeListener();
  }

  bindEvents() {
    document.getElementById('btn-nuevo-pedido')?.addEventListener('click', () => {
      this.showToast('ℹ️ Función en desarrollo', 'info');
    });

    document.getElementById('pedidos-pendientes')?.addEventListener('click', (e) => this.handlePedidoAction(e, 'pendiente'));
    document.getElementById('pedidos-preparados')?.addEventListener('click', (e) => this.handlePedidoAction(e, 'preparado'));
    document.getElementById('pedidos-entregados')?.addEventListener('click', (e) => this.handlePedidoAction(e, 'entregado'));
  }

  handlePedidoAction(event, estado) {
    const btn = event.target.closest('button');
    const card = event.target.closest('[data-pedido-id]');
    
    if (!btn || !card) return;
    
    const pedidoId = card.dataset.pedidoId;
    const action = btn.dataset.action;

    switch(action) {
      case 'cambiar-estado':
        this.cambiarEstado(pedidoId, btn.dataset.nuevoEstado);
        break;
      case 'anular':
        this.anularPedido(pedidoId);
        break;
      case 'ver-detalle':
        this.verDetalle(pedidoId);
        break;
    }
  }

  async load() {
    try {
      const pedidos = await FirebaseHelpers.list({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        orderBy: 'timestamp',
        order: 'desc',
        limit: 100
      });

      const pendientes = pedidos.filter(p => p.estado === 'pendiente');
      const preparados = pedidos.filter(p => ['preparado', 'listo'].includes(p.estado));
      const entregados = pedidos.filter(p => p.estado === 'entregado');

      this.renderColumn('pedidos-pendientes', pendientes, 'pendiente');
      this.renderColumn('pedidos-preparados', preparados, 'preparado');
      this.renderColumn('pedidos-entregados', entregados, 'entregado');

      this.updateCounters(pendientes.length, preparados.length, entregados.length);

    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      this.showError('Error al cargar pedidos');
    }
  }

  renderColumn(containerId, pedidos, estado) {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    if (!pedidos.length) {
      container.innerHTML = '<div class="text-center text-muted py-5">No hay pedidos</div>';
      return;
    }

    container.innerHTML = pedidos.map(pedido => this.renderPedidoCard(pedido, estado)).join('');
  }

  // ✅ ESTE ES EL MÉTODO CLAVE - DEBE SER IGUAL AL DE PANEL.HTML
  renderPedidoCard(pedido, estado) {
    const fecha = new Date(pedido.timestamp || Date.now()).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const total = Formatters.currency(pedido.total || pedido.subtotal || 0);
    const cliente = pedido.cliente || {};
    const metodoEntrega = pedido.metodoEntrega || 'domicilio';
    
    const metodoLabels = {
      'domicilio': '🚚 A Domicilio',
      'recoger': '🏪 Paso a Recoger',
      'mesa': '🍽️ En Mesa'
    };
    
    const badgeConfig = {
      'pendiente': { class: 'pedido-badge pendiente', text: '⏳ Pendiente' },
      'preparado': { class: 'pedido-badge preparado', text: '✅ Listo' },
      'listo': { class: 'pedido-badge preparado', text: '✅ Listo' },
      'entregado': { class: 'pedido-badge entregado', text: '📦 Entregado' }
    };
    
    const badge = badgeConfig[estado] || badgeConfig.pendiente;
    const cardClass = estado === 'preparado' || estado === 'listo' ? 'pedido-card preparado' : 
                      estado === 'entregado' ? 'pedido-card entregado' : 'pedido-card';
    
    const metodoClass = metodoEntrega === 'domicilio' ? 'domicilio' : 'recoger';
    const metodoIcon = metodoEntrega === 'domicilio' ? '🚚' : metodoEntrega === 'mesa' ? '🍽️' : '🏪';
    
    let direccionHTML = '';
    if (metodoEntrega === 'domicilio' && pedido.direccion) {
      direccionHTML = `
        <div class="pedido-info-item">
          <i class="bi bi-geo-alt-fill"></i>
          <span class="info-label">Dirección:</span>
          <span class="info-value">${pedido.direccion}</span>
          ${pedido.barrio ? `<br><small style="color: #64748b; margin-left: 90px;">Barrio: ${pedido.barrio}</small>` : ''}
        </div>
      `;
    }
    
    let observacionesHTML = '';
    if (pedido.observaciones && pedido.observaciones.trim() !== '') {
      observacionesHTML = `
        <div class="pedido-observaciones">
          <div class="obs-title">📝 Observaciones:</div>
          <div class="obs-text">${pedido.observaciones}</div>
        </div>
      `;
    }
    
    const productosHTML = this.renderizarProductosPedido(pedido.productos || []);
    
    let accionesHTML = '';
    if (estado === 'pendiente') {
      accionesHTML = `
        <div class="pedido-actions">
          <button class="btn-action-success" onclick="event.stopPropagation(); window.cambiarEstadoPedido('${pedido.id}', 'preparado')">
            <i class="bi bi-check-circle"></i> Preparar
          </button>
          <button class="btn-action-danger" onclick="event.stopPropagation(); window.anularPedido('${pedido.id}')">
            <i class="bi bi-x-circle"></i> Anular
          </button>
        </div>
      `;
    } else if (estado === 'preparado' || estado === 'listo') {
      accionesHTML = `
        <div class="pedido-actions">
          <button class="btn-action-primary" onclick="event.stopPropagation(); window.cambiarEstadoPedido('${pedido.id}', 'entregado')">
            <i class="bi bi-truck"></i> Entregar
          </button>
        </div>
      `;
    }
    
    return `
      <div class="${cardClass}" data-pedido-id="${pedido.id}" onclick="window.verDetallePedido?.('${pedido.id}')">
        <div class="pedido-header">
          <div class="pedido-id">
            🧾 Pedido #${pedido.consecutivo || pedido.id?.substring(0, 8).toUpperCase()}
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="pedido-fecha">${fecha}</span>
            <span class="${badge.class}">${badge.text}</span>
          </div>
        </div>
        
        <div class="pedido-info">
          <div class="pedido-info-item">
            <i class="bi bi-person-fill"></i>
            <span class="info-label">Nombre:</span>
            <span class="info-value">${cliente.nombre || 'Cliente Invitado'}</span>
          </div>
          <div class="pedido-info-item">
            <i class="bi bi-telephone-fill"></i>
            <span class="info-label">Cel:</span>
            <span class="info-value">${cliente.telefono || cliente.celular || 'No registrado'}</span>
          </div>
          <div class="pedido-info-item">
            <i class="bi bi-truck-fill"></i>
            <span class="info-label">Modo Entrega:</span>
            <span class="pedido-metodo-entrega ${metodoClass}">
              ${metodoIcon} ${metodoLabels[metodoEntrega] || metodoEntrega}
            </span>
          </div>
          ${direccionHTML}
        </div>
        
        ${observacionesHTML}
        ${productosHTML}
        
        <div class="pedido-footer">
          <div class="pedido-total-label">💰 Total</div>
          <div class="pedido-total">$${total}</div>
        </div>
        
        ${accionesHTML}
      </div>
    `;
  }

  renderizarProductosPedido(productos) {
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.9em;">Sin productos</div>';
    }
    
    let html = `
      <div class="pedido-productos-header">
        <span>Producto</span>
        <span>Cant.</span>
        <span>Subtotal</span>
      </div>
    `;
    
    productos.forEach(producto => {
      const nombre = producto.nombre || 'Producto sin nombre';
      const cantidad = producto.cantidad || producto.qty || 1;
      const precio = producto.precio || 0;
      const subtotal = (precio * cantidad);
      const modo = producto.modo || 'unidad';
      const modoLabel = modo === 'paquete' ? '📦' : '🍦';
      
      html += `
        <div class="pedido-producto">
          <div class="pedido-producto-nombre">
            ${modoLabel} ${nombre}
            ${producto.unidadesPorPaquete > 0 ? 
              `<br><small style="color: #64748b; font-size: 0.85em;">${producto.unidadesPorPaquete} uds/paq</small>` : ''}
          </div>
          <div class="pedido-producto-cantidad">${cantidad}</div>
          <div class="pedido-producto-subtotal">$${subtotal.toLocaleString('es-CO')}</div>
        </div>
      `;
    });
    
    return `<div class="pedido-productos">${html}</div>`;
  }

  getTipoEntregaLabel(tipo) {
    const labels = {
      'mesa': '🍽️ Mesa',
      'domicilio': '🚚 Domicilio', 
      'recoger': '📦 Recoger'
    };
    return labels[tipo] || '📦';
  }

  getEstadoBadgeClass(estado) {
    const classes = {
      'pendiente': 'bg-warning text-dark',
      'preparado': 'bg-success',
      'listo': 'bg-success',
      'entregado': 'bg-info',
      'anulado': 'bg-secondary'
    };
    return classes[estado] || 'bg-secondary';
  }

  getEstadoLabel(estado) {
    const labels = {
      'pendiente': '⏳ Pendiente',
      'preparado': '✅ Listo',
      'listo': '✅ Listo',
      'entregado': '📦 Entregado',
      'anulado': '❌ Anulado'
    };
    return labels[estado] || estado;
  }

  getAccionesButtons(pedidoId, estado) {
    if (estado === 'pendiente') {
      return `
        <button class="btn btn-sm btn-success" data-action="cambiar-estado" data-nuevo-estado="preparado">
          <i class="bi bi-check-lg me-1"></i>Marcar Listo
        </button>
        <button class="btn btn-sm btn-outline-danger" data-action="anular">
          <i class="bi bi-x-lg me-1"></i>Anular
        </button>
      `;
    } else if (estado === 'preparado' || estado === 'listo') {
      return `
        <button class="btn btn-sm btn-primary" data-action="cambiar-estado" data-nuevo-estado="entregado">
          <i class="bi bi-truck me-1"></i>Entregar
        </button>
        <button class="btn btn-sm btn-outline-warning" data-action="cambiar-estado" data-nuevo-estado="pendiente">
          <i class="bi bi-arrow-counterclockwise me-1"></i>Volver
        </button>
      `;
    } else if (estado === 'entregado') {
      return `
        <button class="btn btn-sm btn-outline-secondary" data-action="ver-detalle">
          <i class="bi bi-eye me-1"></i>Ver Detalle
        </button>
      `;
    }
    return '';
  }

  updateCounters(pendientes, preparados, entregados) {
    const countPendientes = document.getElementById('count-pendientes');
    const countPreparados = document.getElementById('count-preparados');
    const countEntregados = document.getElementById('count-entregados');
    
    if (countPendientes) countPendientes.textContent = pendientes;
    if (countPreparados) countPreparados.textContent = preparados;
    if (countEntregados) countEntregados.textContent = entregados;
  }

  setupRealTimeListener() {
    this.cleanupListeners();

    this.cleanupFunction = FirebaseHelpers.onValue({
      path: this.config.ruta_db,
      negocioId: this.negocioId,
      callback: () => {
        this.load();
      }
    });
  }

  cleanupListeners() {
    if (this.cleanupFunction && typeof this.cleanupFunction === 'function') {
      this.cleanupFunction();
      this.cleanupFunction = null;
    }
  }

  async cambiarEstado(pedidoId, nuevoEstado) {
    try {
      await FirebaseHelpers.update({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        id: pedidoId,
        data: { 
          estado: nuevoEstado,
          actualizadoEn: Date.now(),
          actualizadoPor: window.auth?.currentUser?.email || 'admin'
        }
      });

      this.showToast(`✅ Pedido actualizado a: ${nuevoEstado}`, 'success');
      
      if (nuevoEstado === 'entregado') {
        await this.actualizarFidelizacion(pedidoId);
      }
      
      // NO llamar this.load() aquí - el listener en tiempo real lo hará
      
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      this.showToast('❌ Error al actualizar estado', 'error');
    }
  }

  async actualizarFidelizacion(pedidoId) {
    try {
      const pedido = await FirebaseHelpers.get({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        id: pedidoId
      });

      const UMBRAL_MINIMO = 10000;
      if (pedido?.esRecompensa === true || (pedido?.total || 0) < UMBRAL_MINIMO || !pedido?.cliente?.uid) {
        return;
      }

      const clienteRef = `negocios/${this.negocioId}/clientes/${pedido.cliente.uid}`;
      const cliente = await FirebaseHelpers.get({
        path: clienteRef,
        negocioId: this.negocioId,
        id: pedido.cliente.uid
      });

      if (cliente?.fidelizacion) {
        const nuevosPuntos = (cliente.fidelizacion.total_pedidos || 0) + 1;
        const recompensasGanadas = Math.floor(nuevosPuntos / 10);
        const recompensasCanjeadas = cliente.fidelizacion.recompensas_canjeadas || 0;
        const recompensasDisponibles = Math.max(0, recompensasGanadas - recompensasCanjeadas);

        await FirebaseHelpers.update({
          path: clienteRef,
          negocioId: this.negocioId,
          id: pedido.cliente.uid,
          data: {
            'fidelizacion.total_pedidos': nuevosPuntos,
            'fidelizacion.recompensas_ganadas': recompensasGanadas,
            'fidelizacion.recompensas_disponibles': recompensasDisponibles,
            'fidelizacion.ultimo_pedido_en': Date.now()
          }
        });
      }
    } catch (error) {
      console.error('Error actualizando fidelización:', error);
    }
  }

  async anularPedido(pedidoId) {
    if (!confirm('¿Estás seguro de anular este pedido?')) return;

    try {
      await FirebaseHelpers.update({
        path: this.config.ruta_db,
        negocioId: this.negocioId,
        id: pedidoId,
        data: {
          estado: 'anulado',
          anuladoEn: Date.now(),
          anuladoPor: window.auth?.currentUser?.email || 'admin'
        }
      });

      this.showToast('🗑️ Pedido anulado', 'success');
      // El listener en tiempo real recargará
      
    } catch (error) {
      console.error('Error anulando pedido:', error);
      this.showToast('❌ Error al anular', 'error');
    }
  }

  verDetalle(pedidoId) {
    this.showToast('ℹ️ Vista de detalle en desarrollo', 'info');
  }

  showError(message) {
    const container = document.getElementById(`module-${this.config.id}`);
    if (container) {
      container.innerHTML = `<div class="alert alert-danger m-3">${message}</div>`;
    }
  }

  destroy() {
    this.cleanupListeners();
    super.destroy?.();
  }
}

// ============================================================================
// FUNCIONES GLOBALES - DELEGAN AL MÓDULO
// ============================================================================

window.cambiarEstadoPedido = async function(pedidoId, nuevoEstado) {
  try {
    if (window.modules?.pedidos) {
      await window.modules.pedidos.cambiarEstado(pedidoId, nuevoEstado);
    } else {
      const negocioId = window.currentNegocioId || window.NEGOCIO_ID;
      if (!negocioId) throw new Error('No se encontró el ID del negocio');
      
      await window.db.ref(`negocios/${negocioId}/pedidos/${pedidoId}`).update({
        estado: nuevoEstado,
        actualizadoEn: Date.now()
      });
      
      if (typeof window.renderizarTodosLosPedidos === 'function' && window.pedidosDataCache) {
        await window.refrescarPedidos();
      }
    }
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('❌ Error al actualizar el pedido', 'error');
    } else {
      alert('❌ Error al actualizar el pedido: ' + error.message);
    }
  }
};

window.anularPedido = async function(pedidoId) {
  if (!confirm('¿Estás seguro de anular este pedido?')) return;
  
  try {
    if (window.modules?.pedidos) {
      await window.modules.pedidos.anularPedido(pedidoId);
    } else {
      const negocioId = window.currentNegocioId || window.NEGOCIO_ID;
      if (!negocioId) throw new Error('No se encontró el ID del negocio');
      
      await window.db.ref(`negocios/${negocioId}/pedidos/${pedidoId}`).update({
        estado: 'anulado',
        actualizadoEn: Date.now()
      });
      
      if (typeof window.renderizarTodosLosPedidos === 'function' && window.pedidosDataCache) {
        await window.refrescarPedidos();
      }
    }
  } catch (error) {
    console.error('Error al anular:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('❌ Error al anular el pedido', 'error');
    } else {
      alert('❌ Error al anular el pedido: ' + error.message);
    }
  }
};

window.verDetallePedido = function(pedidoId) {
  if (window.modules?.pedidos) {
    window.modules.pedidos.verDetalle(pedidoId);
  } else if (typeof window.verDetallePedido === 'function') {
    window.verDetallePedido(pedidoId);
  } else {
    alert(`Ver detalle del pedido: ${pedidoId}`);
  }
};

window.abrirModalNuevoPedido = function() {
  if (window.modules?.pedidos) {
    window.modules.pedidos.showToast('ℹ️ Función en desarrollo', 'info');
  } else {
    alert('Función para crear nuevo pedido - Implementar según necesidades');
  }
};

window.recargarPedidos = function() {
  if (window.modules?.pedidos) {
    window.modules.pedidos.load();
  } else if (typeof window.renderizarTodosLosPedidos === 'function') {
    window.refrescarPedidos();
  }
};