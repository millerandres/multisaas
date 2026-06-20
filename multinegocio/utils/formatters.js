// utils/formatters.js - Funciones de formateo centralizadas
export const Formatters = {
  /**
   * Formatea número como moneda colombiana
   * @param {number} amount - Valor a formatear
   * @param {string} currency - Código de moneda (COP, USD, EUR)
   * @returns {string} Ej: "$25.000"
   */
  currency: (amount, currency = 'COP') => {
    const locales = { COP: 'es-CO', USD: 'en-US', EUR: 'de-DE' };
    return new Intl.NumberFormat(locales[currency] || 'es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  },

  /**
   * Formatea timestamp como fecha corta
   * @param {number} timestamp - Timestamp en milisegundos
   * @returns {string} Ej: "16 may 2024"
   */
  shortDate: (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  /**
   * Formatea timestamp como fecha y hora
   * @param {number} timestamp 
   * @returns {string} Ej: "16 may 14:30"
   */
  dateTime: (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Formatea timestamp como hora corta
   * @param {number} timestamp 
   * @returns {string} Ej: "14:30"
   */
  time: (timestamp) => {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Genera badge HTML para estados
   * @param {string} status - Estado: pendiente, preparado, entregado, etc.
   * @param {Object} config - Configuración opcional con labels personalizados
   * @returns {string} HTML del badge
   */
  statusBadge: (status, config = {}) => {
    const styles = {
      pendiente: 'warning',
      preparando: 'info',
      preparado: 'info',
      entregado: 'success',
      cancelado: 'danger',
      anulado: 'danger',
      activo: 'success',
      inactivo: 'secondary',
      disponible: 'success',
      agotado: 'danger'
    };
    const labels = {
      pendiente: '⏳ Pendiente',
      preparando: '👨‍🍳 Preparando',
      preparado: '✅ Listo',
      entregado: '📦 Entregado',
      cancelado: '❌ Cancelado',
      anulado: '❌ Anulado'
    };
    
    const label = config.labels?.[status] || labels[status] || status?.toUpperCase() || '-';
    const variant = styles[status] || 'secondary';
    return `<span class="badge bg-${variant}">${label}</span>`;
  },

  /**
   * Trunca texto con ellipsis
   * @param {string} text - Texto a truncar
   * @param {number} length - Longitud máxima
   * @returns {string}
   */
  truncate: (text, length = 50) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  },

  /**
   * Obtiene icono por tipo de negocio
   * @param {string} tipo - Tipo de negocio
   * @returns {string} Emoji del icono
   */
  tipoIcon: (tipo) => {
    const icons = {
      restaurante: '🍽️',
      peluqueria: '💇‍♀️',
      licoreria: '🍷',
      minimercado: '🛒',
      clinica: '🏥',
      veterinaria: '🐾',
      academia: '🎓',
      gimnasio: '🏋️',
      default: '🏢'
    };
    return icons[tipo] || icons.default;
  },

  /**
   * Capitaliza primera letra de una cadena
   * @param {string} str 
   * @returns {string}
   */
  capitalize: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Formatea número compacto (1.2K, 3.5M)
   * @param {number} num 
   * @returns {string}
   */
  compact: (num) => {
    return new Intl.NumberFormat('es-CO', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num || 0);
  }
};