// components/ui_card.js - Componente de Tarjeta Estadística

export class UICard {
  /**
   * Crear tarjeta estadística
   * @param {Object} config - Configuración de la tarjeta
   * @param {string} config.title - Título/label
   * @param {string|number} config.value - Valor a mostrar
   * @param {string} config.icon - Icono (emoji o clase Bootstrap)
   * @param {string} config.color - Color primario (hex o nombre)
   * @param {string} config.color2 - Color secundario para gradiente
   * @param {string} config.variant - 'default', 'gradient', 'outline'
   */
  static create(config) {
    const {
      title = 'Título',
      value = '0',
      icon = '📊',
      color = '#667eea',
      color2 = '#764ba2',
      variant = 'gradient'
    } = config;

    let style = '';
    let className = 'card stat-card p-3';

    if (variant === 'gradient') {
      style = `background: linear-gradient(135deg, ${color} 0%, ${color2} 100%); color: white;`;
    } else if (variant === 'outline') {
      className += ` border-${this._getBootstrapColor(color)}`;
      style = `border-left: 4px solid ${color};`;
    } else {
      style = `background: ${color}; color: white;`;
    }

    return `
      <div class="${className}" style="${style}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="stat-number" style="font-size: 2rem; font-weight: bold;">${value}</div>
            <div class="small">${icon} ${title}</div>
          </div>
          ${config.badge ? `<span class="badge bg-light text-dark">${config.badge}</span>` : ''}
        </div>
        ${config.footer ? `<div class="mt-2 small opacity-75">${config.footer}</div>` : ''}
      </div>
    `;
  }

  /**
   * Crear grid de tarjetas
   * @param {Array} cards - Array de configuraciones de tarjetas
   */
  static createGrid(cards) {
    const cols = cards.length <= 2 ? 'col-md-6' : 'col-md-3';
    
    return `
      <div class="row g-3">
        ${cards.map(card => `
          <div class="${cols}">
            ${UICard.create(card)}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Helper: Convertir hex a nombre de color Bootstrap
  static _getBootstrapColor(hex) {
    const colors = {
      '#e67e22': 'orange',
      '#9b59b6': 'purple',
      '#8e44ad': 'purple',
      '#27ae60': 'success',
      '#34495e': 'dark',
      '#3498db': 'primary',
      '#e74c3c': 'danger',
      '#1abc9c': 'info',
      '#2980b9': 'primary',
      '#e91e63': 'danger'
    };
    return colors[hex.toLowerCase()] || 'secondary';
  }
}