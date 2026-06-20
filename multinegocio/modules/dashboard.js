// modules/dashboard.js - Dashboard modular con Calendario de Reservas

import { UICard } from '../components/ui_card.js';
import { UITable } from '../components/ui_table.js';
import { Formatters } from '../utils/formatters.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class DashboardModule {
  constructor(config) {
    this.config = {
      stats: config.stats || [],
      recentItems: config.recentItems || { type: 'pedidos', limit: 5 },
      quickActions: config.quickActions || [],
      ...config
    };
    this.negocioId = null;
    this.negocioConfig = null;
    this.calendarData = [];
    this.equiposData = [];
  }

  // ==================== INICIALIZACIÓN ====================
  init(negocioId, negocioConfig) {
    this.negocioId = negocioId;
    this.negocioConfig = negocioConfig;
    this.render();
    this.loadData();
  }

  // ==================== CARGA DE DATOS ====================
  async loadData() {
    await Promise.all([
      this.loadStats(),
      this.loadRecentItems(),
      this.loadReservas(),
      this.loadEquipos()
    ]);
  }

  // ==================== ESTADÍSTICAS ====================
  async loadStats() {
    try {
      const hoy = new Date().toDateString();
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      
      // Cargar pedidos/reservas
      const pedidosSnap = await FirebaseHelpers.ref(`negocios/${this.negocioId}/pedidos`, this.negocioId).once('value');
      const clientesSnap = await FirebaseHelpers.ref(`negocios/${this.negocioId}/clientes`, this.negocioId).once('value');
      
      let ventasHoy = 0, pedidosHoy = 0, pendientes = 0, ingresosMes = 0;
      let reservasActivas = 0, eventosProximos = 0;
      
      pedidosSnap.forEach(p => {
        const pedido = p.val();
        const fechaPedido = new Date(pedido.fecha || pedido.creadoEn || pedido.timestamp);
        
        // Stats generales
        if (fechaPedido.toDateString() === hoy && pedido.estado !== 'anulado') {
          ventasHoy += pedido.total || 0;
          pedidosHoy++;
        }
        if (pedido.estado === 'pendiente') pendientes++;
        if (fechaPedido.getTime() >= inicioMes && pedido.estado !== 'anulado') {
          ingresosMes += pedido.total || 0;
        }
        
        // Stats para alquileres (reservas)
        if (this.negocioConfig?.nombre === 'Alquileres para Eventos') {
          if (pedido.estado === 'confirmada' || pedido.estado === 'activa') reservasActivas++;
          if (fechaPedido >= new Date() && pedido.estado !== 'cancelada' && pedido.estado !== 'anulado') {
            eventosProximos++;
          }
        }
      });
      
      // Contar clientes (excluyendo admins)
      const clientesCount = Object.values(clientesSnap.val() || {}).filter(c => !c?.isAdmin).length;
      
      // Contar equipos disponibles
      const equiposDisponibles = await this.getEquiposDisponiblesCount();
      
      // Actualizar DOM según configuración
      this.config.stats.forEach((stat, index) => {
        const el = document.querySelector(`#dashboard-stats .card:nth-child(${index + 1}) .stat-number`);
        if (!el) return;
        
        let value = '0';
        switch(stat.key) {
          case 'ventas_hoy':
            value = Formatters.currency(ventasHoy);
            break;
          case 'pedidos_hoy':
            value = pedidosHoy;
            break;
          case 'pendientes':
            value = pendientes;
            break;
          case 'clientes':
          case 'clientes_nuevos':
            value = clientesCount;
            break;
          case 'ticket_promedio':
            value = Formatters.currency(pedidosHoy > 0 ? ventasHoy / pedidosHoy : 0);
            break;
          case 'ingresos_mes':
            value = Formatters.currency(ingresosMes);
            break;
          // Stats específicos para alquileres
          case 'reservas_activas':
            value = reservasActivas;
            break;
          case 'eventos_proximos':
            value = eventosProximos;
            break;
          case 'equipos_disponibles':
            value = equiposDisponibles;
            break;
          default:
            value = '0';
        }
        el.textContent = value;
      });
      
    } catch (err) {
      console.error('Error cargando stats:', err);
    }
  }

  // ==================== RESERVAS / CALENDARIO ====================
  async loadReservas() {
    try {
      // Determinar ruta según tipo de negocio
      const path = this.negocioConfig?.nombre === 'Alquileres para Eventos' 
        ? `negocios/${this.negocioId}/pedidos` 
        : `negocios/${this.negocioId}/reservas`;
      
      const snapshot = await FirebaseHelpers.ref(path, this.negocioId).once('value');
      this.calendarData = [];
      
      snapshot.forEach(child => {
        const reserva = child.val();
        // Filtrar solo reservas activas o pendientes
        if (['pendiente', 'confirmada', 'activa'].includes(reserva.estado)) {
          const fechaInicio = reserva.fechaInicio || reserva.fecha || reserva.timestamp;
          const fechaFin = reserva.fechaFin || (fechaInicio + 86400000); // +1 día por defecto
          
          this.calendarData.push({
            id: child.key,
            ...reserva,
            title: reserva.cliente || reserva.equipo || `Reserva #${child.key.substr(0,6)}`,
            start: fechaInicio,
            end: fechaFin,
            status: reserva.estado || 'pendiente',
            equipo: reserva.equipo || reserva.productos?.[0]?.nombre || 'Varios',
            total: reserva.total || 0
          });
        }
      });
      
      // Ordenar por fecha
      this.calendarData.sort((a, b) => a.start - b.start);
      
      this.updateStatsCards();
      this.renderCalendar();
      
    } catch (error) {
      console.error('Error cargando reservas:', error);
    }
  }

  // ==================== EQUIPOS DISPONIBLES ====================
  async loadEquipos() {
    try {
      if (this.negocioConfig?.nombre !== 'Alquileres para Eventos') return;
      
      const snapshot = await FirebaseHelpers.ref(`negocios/${this.negocioId}/menu`, this.negocioId).once('value');
      this.equiposData = [];
      
      snapshot.forEach(catSnap => {
        const categoria = catSnap.val();
        if (categoria.productos) {
          Object.entries(categoria.productos).forEach(([id, producto]) => {
            if (producto.activo !== false) {
              this.equiposData.push({
                id,
                ...producto,
                categoria: categoria.nombre
              });
            }
          });
        }
      });
      
    } catch (err) {
      console.error('Error cargando equipos:', err);
    }
  }

  async getEquiposDisponiblesCount() {
    if (this.negocioConfig?.nombre !== 'Alquileres para Eventos') return 0;
    
    // Contar equipos con stock disponible
    return this.equiposData.filter(e => 
      (e.stockTotal || 0) > 0 && e.activo !== false
    ).length;
  }

  // ==================== ACTUALIZAR CARDS DE ESTADÍSTICAS ====================
  updateStatsCards() {
    const hoy = new Date();
    
    // Filtrar reservas activas
    const reservasActivas = this.calendarData.filter(r => 
      ['confirmada', 'activa'].includes(r.status)
    ).length;
    
    // Eventos próximos (próximos 30 días)
    const proximosEventos = this.calendarData.filter(r => {
      const fecha = new Date(r.start);
      const diffDias = (fecha - hoy) / (1000 * 60 * 60 * 24);
      return diffDias >= 0 && diffDias <= 30 && r.status !== 'cancelada';
    }).length;
    
    // Equipos disponibles
    const equiposDisponibles = this.equiposData.filter(e => 
      (e.stockTotal || 0) > 0 && e.activo !== false
    ).length;
    
    // Ingresos del mes (de reservas confirmadas)
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
    const ingresosMes = this.calendarData
      .filter(r => r.start >= inicioMes && ['confirmada', 'activa'].includes(r.status))
      .reduce((sum, r) => sum + (r.total || 0), 0);
    
    // Actualizar elementos del DOM
    const updates = {
      'stat-reservas': reservasActivas,
      'stat-eventos': proximosEventos,
      'stat-equipos': equiposDisponibles,
      'stat-ingresos': `$${Formatters.currency(ingresosMes)}`
    };
    
    Object.entries(updates).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  // ==================== RENDERIZAR CALENDARIO ====================
  renderCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;
    
    if (this.calendarData.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-calendar-x" style="font-size: 3rem; color: #cbd5e1;"></i>
          <p class="text-muted mt-3">No hay reservas recientes</p>
          <button class="btn btn-primary btn-sm mt-2" onclick="app?.navigate?.('pedidos')">
            <i class="bi bi-plus-circle"></i> Nueva Reserva
          </button>
        </div>
      `;
      return;
    }
    
    // Agrupar por semana del mes
    const semanas = this.agruparPorSemanas(this.calendarData);
    
    container.innerHTML = `
      <div class="calendar-header d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">📅 Reservas del Mes</h5>
        <span class="badge bg-primary">${this.calendarData.length} reservas</span>
      </div>
      
      <div class="calendar-weeks">
        ${semanas.map((semana, index) => `
          <div class="calendar-week mb-3">
            <h6 class="text-muted small mb-2">Semana ${index + 1}</h6>
            <div class="calendar-grid">
              ${semana.map(reserva => this.renderEventoCalendario(reserva)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderEventoCalendario(reserva) {
    const fecha = new Date(reserva.start);
    const dia = fecha.getDate();
    const mes = fecha.toLocaleDateString('es-CO', { month: 'short' });
    
    return `
      <div class="calendar-event ${reserva.status}" 
           style="background: ${this.getColorForStatus(reserva.status)}"
           title="${reserva.title} - ${reserva.equipo}">
        <div class="event-date">
          <strong>${dia}</strong>
          <small>${mes}</small>
        </div>
        <div class="event-info">
          <strong class="event-title">${reserva.title}</strong>
          <small class="event-equipo">${reserva.equipo}</small>
          ${reserva.total ? `<small class="event-total">$${Formatters.currency(reserva.total)}</small>` : ''}
        </div>
        <span class="event-status badge ${this.getStatusBadgeClass(reserva.status)}">
          ${reserva.status}
        </span>
      </div>
    `;
  }

  agruparPorSemanas(reservas) {
    const semanas = [[], [], [], [], []]; // Máximo 5 semanas por mes
    
    reservas.forEach(reserva => {
      const fecha = new Date(reserva.start);
      const dia = fecha.getDate();
      const semanaIndex = Math.min(Math.ceil(dia / 7) - 1, 4);
      semanas[semanaIndex].push(reserva);
    });
    
    // Filtrar semanas vacías
    return semanas.filter(semana => semana.length > 0);
  }

  getColorForStatus(status) {
    const colors = {
      'confirmada': 'linear-gradient(135deg, #10b981, #059669)',
      'activa': 'linear-gradient(135deg, #3b82f6, #2563eb)',
      'pendiente': 'linear-gradient(135deg, #f59e0b, #d97706)',
      'cancelada': 'linear-gradient(135deg, #ef4444, #dc2626)',
      'completada': 'linear-gradient(135deg, #6b7280, #4b5563)'
    };
    return colors[status] || 'linear-gradient(135deg, #667eea, #764ba2)';
  }

  getStatusBadgeClass(status) {
    const classes = {
      'confirmada': 'bg-success',
      'activa': 'bg-primary',
      'pendiente': 'bg-warning text-dark',
      'cancelada': 'bg-danger',
      'completada': 'bg-secondary'
    };
    return classes[status] || 'bg-info';
  }

  // ==================== ITEMS RECIENTES ====================
  async loadRecentItems() {
    const { type, limit } = this.config.recentItems;
    const container = document.getElementById('dashboard-recent-list');
    
    try {
      const items = await FirebaseHelpers.list({
        path: `negocios/${this.negocioId}/${type}`,
        negocioId: this.negocioId,
        orderBy: 'creadoEn',
        order: 'desc',
        limit: limit || 5
      });
      
      if (!items.length) {
        container.innerHTML = '<div class="text-center text-muted py-3">No hay registros recientes</div>';
        return;
      }
      
      container.innerHTML = items.map(item => {
        const fecha = Formatters.shortDate(item.creadoEn || item.fecha);
        const total = item.total ? Formatters.currency(item.total) : '';
        const estado = item.estado ? Formatters.statusBadge(item.estado) : '';
        
        return `
          <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
            <div>
              <strong>${item.nombre || item.cliente || `#${item.id?.substr(0,6)}`}</strong>
              <div class="small text-muted">${fecha}</div>
            </div>
            <div class="text-end">
              ${total ? `<div class="fw-bold">${total}</div>` : ''}
              ${estado}
            </div>
          </div>
        `;
      }).join('');
      
    } catch (err) {
      container.innerHTML = `<div class="alert alert-danger small">Error: ${err.message}</div>`;
    }
  }

  // ==================== RENDER PRINCIPAL ====================
  render() {
    const container = document.getElementById('module-dashboard');
    if (!container) return;

    // Configurar cards de estadísticas según tipo de negocio
    const statsCards = this.config.stats.map(stat => {
      // Adaptar labels para alquileres
      let label = stat.label;
      let icon = stat.icon || '📊';
      
      if (this.negocioConfig?.nombre === 'Alquileres para Eventos') {
        if (stat.key === 'pedidos_hoy') { label = 'Reservas Hoy'; icon = '📅'; }
        if (stat.key === 'pendientes') { label = 'Por Confirmar'; icon = '⏳'; }
      }
      
      return {
        title: label,
        value: 'Cargando...',
        icon: icon,
        color: stat.color || '#667eea',
        color2: stat.color2 || '#764ba2',
        variant: 'gradient'
      };
    });

    // Quick actions adaptados
    const quickActions = [
      ...this.config.quickActions,
      { 
        label: this.negocioConfig?.nombre === 'Alquileres para Eventos' ? '📅 Nueva Reserva' : '🛒 Nuevo Pedido',
        icon: 'plus-circle', 
        variant: 'success',
        onClick: `app?.navigate?.('pedidos')` 
      },
      { 
        label: '📦 Gestionar Equipos', 
        icon: 'box-seam', 
        variant: 'outline-primary',
        onClick: `app?.navigate?.('productos')`,
        feature: 'productos'
      }
    ];
    
    const quickActionsHtml = quickActions.map(action => `
      <button class="btn btn-${action.variant || 'primary'} w-100 mb-2" 
              onclick="${action.onClick}" 
              ${action.feature ? `data-feature="${action.feature}"` : ''}>
        <i class="bi bi-${action.icon} me-2"></i>${action.label}
      </button>
    `).join('');

    // HTML del calendario (se llena con JS)
    const calendarHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <i class="bi bi-calendar-event me-2"></i>
          <h5 class="mb-0">Calendario de Reservas</h5>
        </div>
        <span class="badge bg-primary" id="calendar-count">0 reservas</span>
      </div>
      <div class="card-body" id="calendar-container">
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted">Cargando calendario...</p>
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">${this.negocioConfig?.icono || '📊'} Dashboard</h4>
        <span class="badge bg-light text-dark border">
          ${this.negocioConfig?.nombre || 'Negocio'}
        </span>
      </div>
      
      <!-- Stats Cards -->
      <div class="mb-4" id="dashboard-stats">
        ${UICard.createGrid(statsCards)}
      </div>
      
      <div class="row g-4">
        <!-- Calendario -->
        <div class="col-lg-8">
          <div class="card">
            ${calendarHTML}
          </div>
        </div>
        
        <!-- Actividad Reciente + Acciones -->
        <div class="col-lg-4">
          <div class="card mb-4">
            <div class="card-header">
              <i class="bi bi-clock-history me-2"></i>
              <h5 class="mb-0">Actividad Reciente</h5>
            </div>
            <div class="card-body p-0" id="dashboard-recent-list">
              <div class="loading small">Cargando...</div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-header">
              <i class="bi bi-lightning me-2"></i>
              <h5 class="mb-0">Acceso Rápido</h5>
            </div>
            <div class="card-body">
              ${quickActionsHtml}
              <a href="app.html?negocio=${this.negocioId}" target="_blank" 
                 class="btn btn-outline-secondary w-100 mt-2">
                <i class="bi bi-shop me-2"></i>Ver Tienda Online
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== UTILS ====================
  formatDate(fecha) {
    return new Date(fecha).toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  }

  // Limpiar recursos al destruir el módulo
  destroy() {
    this.calendarData = [];
    this.equiposData = [];
  }
}