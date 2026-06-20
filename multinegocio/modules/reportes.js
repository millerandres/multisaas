// modules/reportes.js - Reportes, Estadísticas y Exportación

import { UICard } from '../components/ui_card.js';
import { UITable } from '../components/ui_table.js';
import { Formatters } from '../utils/formatters.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class ReportesModule {
  constructor(config) {
    this.config = {
      periods: [
        { key: 'dia', label: 'Hoy' },
        { key: 'semana', label: 'Esta Semana' },
        { key: 'mes', label: 'Este Mes' }
      ],
      ...config
    };
    this.negocioId = null;
    this.currentPeriod = 'dia';
    this.cacheData = null; // Cache para evitar múltiples lecturas
  }

  init(negocioId) {
    this.negocioId = negocioId;
    this.render();
    this.bindEvents();
    this.load();
  }

  render() {
    const container = document.getElementById('module-reportes');
    if (!container) return;

    const periodButtons = this.config.periods.map(p =>
      `<button class="btn btn-outline-primary ${p.key === this.currentPeriod ? 'active' : ''}" data-period="${p.key}">${p.label}</button>`
    ).join('');

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4>📊 Reportes</h4>
        <div class="btn-group" role="group">
          ${periodButtons}
        </div>
      </div>

      <!-- Resumen Cards -->
      <div class="row g-3 mb-4" id="reportes-cards">
        <div class="col-12"><div class="loading">Cargando resumen...</div></div>
      </div>

      <!-- Top Productos -->
      <div class="card p-3">
        <h5 class="mb-3">🏆 Productos/Servicios Más Vendidos</h5>
        <div id="reportes-top-list">
          <div class="loading">Cargando...</div>
        </div>
      </div>

      <!-- Exportar -->
      <div class="mt-3 text-end">
        <button class="btn btn-outline-success" id="btn-export-csv">
          <i class="bi bi-download me-2"></i>Exportar CSV
        </button>
      </div>
    `;
  }

  bindEvents() {
    // Cambio de período
    document.querySelectorAll('#module-reportes [data-period]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#module-reportes [data-period]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentPeriod = e.currentTarget.dataset.period;
        this.load();
      });
    });

    // Exportar
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      this.exportCSV();
    });
  }

  async load() {
    const { start, end } = this.getPeriodDates();
    const listEl = document.getElementById('reportes-top-list');
    listEl.innerHTML = '<div class="loading">Cargando datos...</div>';

    try {
      const pedidosSnap = await FirebaseHelpers.ref(`negocios/${this.negocioId}/pedidos`, this.negocioId).once('value');
      let ventas = 0, pedidosCompletados = 0, pendientes = 0;
      const productosCount = {};

      pedidosSnap.forEach(p => {
        const pedido = p.val();
        const fecha = new Date(pedido.fecha || pedido.creadoEn);

        // Filtrar por rango de fechas y excluir cancelados
        if (fecha >= start && fecha <= end && pedido.estado !== 'cancelado') {
          ventas += pedido.total || 0;
          if (['entregado', 'listo'].includes(pedido.estado)) pedidosCompletados++;
          if (pedido.estado === 'pendiente') pendientes++;

          // Contar productos vendidos
          if (pedido.productos) {
            pedido.productos.forEach(prod => {
              const nombre = prod.nombre || 'Desconocido';
              productosCount[nombre] = (productosCount[nombre] || 0) + (prod.qty || 1);
            });
          }
        }
      });

      this.cacheData = { ventas, pedidosCompletados, pendientes, productosCount, start, end };
      this.renderSummary();
      this.renderTopProducts();

    } catch (err) {
      listEl.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
      console.error('Error loading reports:', err);
    }
  }

  renderSummary() {
    const { ventas, pedidosCompletados, pendientes } = this.cacheData;
    const ticket = pedidosCompletados > 0 ? ventas / pedidosCompletados : 0;

    const cards = [
      { title: 'Ventas del Período', value: Formatters.currency(ventas), icon: '💰', color: '#10b981', color2: '#059669' },
      { title: 'Pedidos Completados', value: pedidosCompletados, icon: '✅', color: '#3b82f6', color2: '#2563eb' },
      { title: 'Pendientes', value: pendientes, icon: '⏳', color: '#f59e0b', color2: '#d97706' },
      { title: 'Ticket Promedio', value: Formatters.currency(ticket), icon: '🧾', color: '#8b5cf6', color2: '#7c3aed' }
    ];

    document.getElementById('reportes-cards').innerHTML = UICard.createGrid(cards);
  }

  renderTopProducts() {
    const { productosCount } = this.cacheData;
    const container = document.getElementById('reportes-top-list');
    const sorted = Object.entries(productosCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    if (!sorted.length) {
      container.innerHTML = '<div class="text-center text-muted py-3">No hay ventas en este período</div>';
      return;
    }

    const data = sorted.map(([nombre, qty], i) => ({
      id: i,
      producto: nombre,
      cantidad: qty
    }));

    container.innerHTML = UITable.create({
      columns: [
        { key: 'id', label: '#', width: '10%' },
        { key: 'producto', label: 'Producto/Servicio', width: '70%' },
        { key: 'cantidad', label: 'Vendidos', width: '20%' }
      ],
      data: data,
      renderRow: (item) => `
        <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
          <span class="fw-bold text-primary">#${item.id + 1}</span>
          <span class="flex-grow-1 ms-3">${item.producto}</span>
          <span class="badge bg-info">${item.cantidad}</span>
        </div>
      `
    });
  }

  getPeriodDates() {
    const now = new Date();
    let start, end = new Date();

    switch(this.currentPeriod) {
      case 'dia':
        start = new Date(now.setHours(0,0,0,0));
        break;
      case 'semana':
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        start.setHours(0,0,0,0);
        break;
      case 'mes':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        start = new Date(now.setHours(0,0,0,0));
    }

    return { start, end };
  }

  exportCSV() {
    if (!this.cacheData) {
      alert('No hay datos para exportar');
      return;
    }

    const { productosCount, start } = this.cacheData;
    let csv = 'Producto,Cantidad\n';
    
    Object.entries(productosCount).forEach(([nombre, qty]) => {
      // Escapar comillas y saltos de línea para CSV válido
      const nombreEscapado = `"${nombre.replace(/"/g, '""')}"`;
      csv += `${nombreEscapado},${qty}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${this.currentPeriod}_${start.toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}