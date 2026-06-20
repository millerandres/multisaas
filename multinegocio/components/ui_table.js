// components/ui_table.js - Componente de Tabla Reutilizable

export class UITable {
  /**
   * Crear tabla con acciones
   * @param {Object} config - Configuración de la tabla
   * @param {Array} config.columns - Columnas [{key: 'nombre', label: 'Nombre', width: '30%'}]
   * @param {Array} config.data - Datos a mostrar
   * @param {Array} config.actions - Acciones [{label: 'Editar', icon: '✏️', variant: 'primary', onClick: fn}]
   * @param {Function} config.renderRow - Función custom para renderizar fila (opcional)
   * @param {string} config.emptyMessage - Mensaje cuando no hay datos
   */
  static create(config) {
    const {
      columns = [],
      data = [],
      actions = [],
      renderRow = null,
      emptyMessage = 'No hay registros'
    } = config;

    if (!data.length) {
      return `
        <div class="text-center text-muted py-5">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          ${emptyMessage}
        </div>
      `;
    }

    // Si hay renderRow custom, usarlo
    if (renderRow) {
      return `
        <div class="table-responsive">
          <div class="list-group">
            ${data.map(item => renderRow(item)).join('')}
          </div>
        </div>
      `;
    }

    // Tabla estándar
    return `
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead class="table-light">
            <tr>
              ${columns.map(col => `
                <th style="width: ${col.width || 'auto'}">${col.label}</th>
              `).join('')}
              ${actions.length ? '<th class="text-end" style="width: 150px">Acciones</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${data.map(item => `
              <tr>
                ${columns.map(col => `
                  <td>${this._renderCell(item[col.key], col.format)}</td>
                `).join('')}
                ${actions.length ? `
                  <td class="text-end">
                    ${actions.map(action => `
                      <button class="btn btn-sm btn-${action.variant || 'outline-primary'} me-1" 
                              title="${action.label}"
                              onclick="${action.onClick ? action.onClick.toString().replace(/"/g, '&quot;') : ''}"
                              data-id="${item.id}">
                        ${action.icon || action.label}
                      </button>
                    `).join('')}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Crear lista tipo card (mejor para móviles)
   */
  static createCardList(config) {
    const {
      data = [],
      renderCard = null,
      actions = [],
      emptyMessage = 'No hay registros'
    } = config;

    if (!data.length) {
      return `
        <div class="text-center text-muted py-5">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          ${emptyMessage}
        </div>
      `;
    }

    if (renderCard) {
      return `
        <div class="list-group">
          ${data.map(item => renderCard(item)).join('')}
        </div>
      `;
    }

    // Default card list
    return `
      <div class="list-group">
        ${data.map(item => `
          <div class="list-group-item list-group-item-action">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>${item.nombre || item.title || 'Sin título'}</strong>
                <div class="text-muted small">${item.descripcion || item.subtitle || ''}</div>
              </div>
              <div class="d-flex gap-1">
                ${actions.map(action => `
                  <button class="btn btn-sm btn-${action.variant || 'outline-primary'}" 
                          data-id="${item.id}">
                    ${action.icon || '🔍'}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Helper: Renderizar celda con formato
  static _renderCell(value, format) {
    if (value === null || value === undefined) return '-';
    
    if (format === 'currency') {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
    }
    if (format === 'date') {
      return new Date(value).toLocaleDateString('es-CO');
    }
    if (format === 'datetime') {
      return new Date(value).toLocaleString('es-CO');
    }
    if (format === 'badge') {
      const colors = { 
        activo: 'success', inactivo: 'secondary', 
        pendiente: 'warning', completado: 'success',
        cancelado: 'danger'
      };
      const color = colors[value] || 'secondary';
      return `<span class="badge bg-${color}">${value}</span>`;
    }
    
    return value;
  }
}