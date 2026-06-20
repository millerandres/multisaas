// components/ui_filters.js - Componente de Barra de Filtros

export class UIFilters {
  /**
   * Crear barra de filtros
   * @param {Object} config - Configuración de filtros
   * @param {Array} config.filters - Filtros disponibles
   * @param {Function} config.onChange - Callback cuando cambian los filtros
   * @param {boolean} config.showSearch - Mostrar campo de búsqueda
   * @param {boolean} config.showSort - Mostrar selector de orden
   * @param {boolean} config.showRefresh - Mostrar botón de refresh
   */
  static create(config) {
    const {
      filters = [],
      onChange = null,
      showSearch = true,
      showSort = true,
      showRefresh = true,
      searchPlaceholder = 'Buscar...',
      sortOptions = [
        { value: 'creadoEn:desc', label: 'Más recientes' },
        { value: 'creadoEn:asc', label: 'Más antiguos' },
        { value: 'nombre:asc', label: 'Nombre A-Z' },
        { value: 'nombre:desc', label: 'Nombre Z-A' }
      ]
    } = config;

    const callbackId = onChange ? `data-callback="${onChange.name || 'onFilterChange'}"` : '';
    
    return `
      <div class="card p-3 mb-3" id="filters-container" ${callbackId}>
        <div class="row g-2 align-items-end">
          ${showSearch ? `
            <div class="col-md-4">
              <label class="form-label small text-muted">🔍 Buscar</label>
              <input type="text" class="form-control form-control-sm" 
                     data-filter="search" placeholder="${searchPlaceholder}">
            </div>
          ` : ''}
          
          ${filters.map(filter => this._renderFilter(filter)).join('')}
          
          ${showSort ? `
            <div class="col-md-3">
              <label class="form-label small text-muted">📊 Ordenar</label>
              <select class="form-select form-select-sm" data-filter="orden">
                ${sortOptions.map(opt => `
                  <option value="${opt.value}">${opt.label}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          
          ${showRefresh ? `
            <div class="col-md-2">
              <button class="btn btn-outline-secondary btn-sm w-100" data-action="refresh" title="Actualizar">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Renderizar filtro individual
  static _renderFilter(filter) {
    const colClass = filter.width === 'full' ? 'col-12' : filter.width === 'half' ? 'col-md-6' : 'col-md-3';
    
    switch(filter.type) {
      case 'select':
        return `
          <div class="${colClass}">
            <label class="form-label small text-muted">${filter.label}</label>
            <select class="form-select form-select-sm" data-filter="${filter.name}">
              <option value="">${filter.placeholder || 'Todos'}</option>
              ${filter.options.map(opt => `
                <option value="${opt.value}">${opt.label}</option>
              `).join('')}
            </select>
          </div>
        `;
      
      case 'date':
        return `
          <div class="${colClass}">
            <label class="form-label small text-muted">${filter.label}</label>
            <input type="date" class="form-control form-control-sm" 
                   data-filter="${filter.name}">
          </div>
        `;
      
      case 'daterange':
        return `
          <div class="${colClass}">
            <label class="form-label small text-muted">${filter.label}</label>
            <div class="input-group input-group-sm">
              <span class="input-group-text">Desde</span>
              <input type="date" class="form-control" data-filter="${filter.name}_from">
              <span class="input-group-text">Hasta</span>
              <input type="date" class="form-control" data-filter="${filter.name}_to">
            </div>
          </div>
        `;
      
      default: // text
        return `
          <div class="${colClass}">
            <label class="form-label small text-muted">${filter.label}</label>
            <input type="text" class="form-control form-control-sm" 
                   data-filter="${filter.name}" placeholder="${filter.placeholder || ''}">
          </div>
        `;
    }
  }

  /**
   * Obtener valores actuales de los filtros
   */
  static getValues(containerId = 'filters-container') {
    const container = document.getElementById(containerId);
    if (!container) return {};
    
    const filters = {};
    container.querySelectorAll('[data-filter]').forEach(el => {
      const key = el.dataset.filter;
      const value = el.value.trim();
      if (value) filters[key] = value;
    });
    
    return filters;
  }

  /**
   * Limpiar todos los filtros
   */
  static clear(containerId = 'filters-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.querySelectorAll('[data-filter]').forEach(el => {
      el.value = '';
    });
    
    // Disparar evento change
    container.dispatchEvent(new CustomEvent('filtersChange', { 
      detail: { filters: {} } 
    }));
  }

  /**
   * Bind de eventos para filtros
   */
  static bindEvents(containerId = 'filters-container', callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Eventos en inputs/selects
    container.querySelectorAll('[data-filter]').forEach(el => {
      el.addEventListener('change', () => {
        const filters = UIFilters.getValues(containerId);
        if (callback) callback(filters);
        container.dispatchEvent(new CustomEvent('filtersChange', { detail: { filters } }));
      });
      
      // Búsqueda en tiempo real (debounce)
      if (el.dataset.filter === 'search') {
        let timeout;
        el.addEventListener('input', () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            const filters = UIFilters.getValues(containerId);
            if (callback) callback(filters);
          }, 300);
        });
      }
    });
    
    // Botón refresh
    container.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
      container.dispatchEvent(new CustomEvent('filtersRefresh'));
    });
  }
}