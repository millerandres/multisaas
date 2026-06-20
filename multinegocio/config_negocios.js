// config_negocios.js - Configuración por vertical del negocio

const CONFIG_NEGOCIOS = {
  
  // 🐾 VETERINARIA (NUEVO)
  veterinaria: {
    icono: "🐾",
    nombre: "Veterinaria",
    modulos: {
      // Core - Siempre activos
      dashboard: true,
      productos: true,        // Productos veterinarios (alimentos, medicamentos, accesorios)
      categorias: true,       // Alimentos, Medicamentos, Accesorios, Juguetes, etc.
      clientes: true,         // Dueños de mascotas
      empleados: true,        // Veterinarios, auxiliares
      reportes: true,
      config: true,
      // Específicos de veterinaria
      inventario: true,       // Control de stock con fechas de vencimiento
      pedidos: true,          // Ventas de productos
      citas: true,            // Consultas veterinarias
      servicios: true,        // Vacunación, desparasitación, cirugías
      fidelizacion: true,     // Programas para clientes frecuentes
      // No aplican
      mesas: false,
      comandas: false,
      cotizaciones: false,
      agenda: false,          // Se usa citas en su lugar
      delivery: false,
      punto_venta: false,
      codigo_barras: false
    },
    // Campos específicos para productos veterinarios
    campos_producto: [
      'precioCompra',        // Precio de adquisición
      'precioVenta',         // Precio al público
      'cantidad',            // Stock disponible
      'fechaVencimiento',    // Para medicamentos y alimentos
      'lote',                // Número de lote
      'marca',               // Marca del producto
      'esMedicamento',       // Booleano para medicamentos
      'requiereReceta',      // Si requiere receta veterinaria
      'categoriaMascota',    // Perro, gato, aves, etc.
      'tamaño'              // Presentación (pequeño, mediano, grande)
    ],
    // Campos específicos para pedidos/ventas
    campos_pedido: [
      'mascotaNombre',       // Nombre de la mascota
      'mascotaEspecie',      // Perro, gato, etc.
      'mascotaRaza',
      'mascotaEdad',
      'propietarioNombre',
      'historialMedico',
      'metodoPago',
      'descuentoAplicado'
    ],
    // Campos para citas/consultas
    campos_cita: [
      'tipoConsulta',        // Consulta general, vacunación, cirugía
      'veterinarioAsignado',
      'duracionEstimada',
      'motivoConsulta',
      'diagnostico',
      'tratamiento',
      'medicamentosRecetados'
    ],
    // Stats para el dashboard
    dashboard_stats: [
      'ventas_hoy',
      'citas_hoy',
      'productos_bajo_stock',
      'productos_vencidos',
      'clientes_nuevos',
      'ingresos_mes'
    ],
    // Colores de la marca
    colores: { primary: '#10b981', secondary: '#059669' }
  },
  
  // 🍽️ RESTAURANTE
  restaurante: {
    icono: "🍽️",
    nombre: "Restaurante",
    modulos: {
      // Core - Siempre activos
      dashboard: true,
      productos: true,
      categorias: true,
      clientes: true,
      empleados: true,
      reportes: true,
      config: true,
      // Específicos de restaurante
      pedidos: true,
      mesas: true,
      comandas: true,
      fidelizacion: true,
      // No aplican
      inventario: false,
      cotizaciones: false,
      agenda: false,
      delivery: false,
      punto_venta: false,
      codigo_barras: false
    },
    // Campos adicionales para productos de restaurante
    campos_producto: ['tiempoPreparacion', 'alergenos', 'picante', 'disponiblePorHorario'],
    campos_pedido: ['mesaNumero', 'comensales', 'notaCocina', 'tipoServicio'],
    // Stats para el dashboard
    dashboard_stats: ['ventas_hoy', 'pedidos_pendientes', 'mesas_ocupadas', 'ticket_promedio'],
    // Colores de la marca
    colores: { primary: '#e67e22', secondary: '#d35400' }
  },
  
  // 🎪 ALQUILERES PARA EVENTOS (NUEVO)
  alquileres_para_eventos: {
    icono: "🎪",
    nombre: "Alquileres para Eventos",
    modulos: {
      // Core - Siempre activos
      dashboard: true,
      productos: true,        // Equipos/Mobiliario disponible
      categorias: true,       // Sillas, mesas, carpas, sonido, etc.
      clientes: true,
      empleados: true,        // Personal de montaje/transporte
      reportes: true,
      config: true,
      // Específicos de alquileres
      inventario: true,       // Control de stock por fechas
      cotizaciones: true,     // Presupuestos para eventos
      agenda: true,           // Reservas por fechas
      delivery: true,         // Logística/Transporte al evento
      // No aplican
      pedidos: false,         // No es venta tradicional
      mesas: false,           // No es restaurante
      comandas: false,
      fidelizacion: false,
      punto_venta: false,
      codigo_barras: false
    },
    // Campos específicos para productos de alquiler
    campos_producto: [
      'precioPorDia',
      'precioPorSemana',
      'depositoGarantia',
      'requiereInstalacion',
      'dimensiones',
      'stockTotal',
      'disponiblePorFechas',
      'categoriaEquipo'
    ],
    // Campos específicos para reservas/pedidos de alquiler
    campos_pedido: [
      'fechaInicio',
      'fechaFin',
      'direccionEvento',
      'horaEntrega',
      'horaRecogida',
      'notasEvento',
      'depositoPagado',
      'tipoEvento',
      'numeroInvitados'
    ],
    // Stats para el dashboard
    dashboard_stats: [
      'reservas_activas',
      'eventos_proximos',
      'equipos_disponibles',
      'ingresos_mes'
    ],
    // Colores de la marca
    colores: { primary: '#4ECDC4', secondary: '#44A3AA' }
  },
  
  // 💇 PELUQUERÍA / SALÓN DE BELLEZA
  peluqueria: {
    icono: "💇‍♀️",
    nombre: "Salón de Belleza",
    modulos: {
      dashboard: true,
      productos: false,       // No vende productos, ofrece servicios
      categorias: true,
      clientes: true,
      empleados: true,
      reportes: true,
      config: true,
      agenda: true,
      citas: true,
      servicios: true,
      fidelizacion: true,
      // No aplican
      pedidos: false,
      mesas: false,
      comandas: false,
      inventario: false,
      cotizaciones: false,
      delivery: false,
      punto_venta: false,
      codigo_barras: false
    },
    campos_producto: ['duracionServicio', 'estilistaRequerido', 'categoriaServicio'],
    campos_pedido: ['estilistaAsignado', 'notasCliente', 'serviciosAdicionales'],
    dashboard_stats: ['citas_hoy', 'clientes_nuevos', 'servicios_populares'],
    colores: { primary: '#9b59b6', secondary: '#8e44ad' }
  },
  
  // 🍺 LICORERÍA
  licoreria: {
    icono: "🍷",
    nombre: "Licorería",
    modulos: {
      dashboard: true,
      productos: true,
      categorias: true,
      clientes: true,
      empleados: true,
      reportes: true,
      config: true,
      pedidos: true,
      inventario: true,
      delivery: true,
      // No aplican
      mesas: false,
      comandas: false,
      fidelizacion: false,
      agenda: false,
      cotizaciones: false,
      punto_venta: false,
      codigo_barras: false
    },
    campos_producto: ['marca', 'graduacionAlcoholica', 'stockMinimo', 'origen'],
    campos_pedido: ['metodoEntrega', 'verificacionEdad', 'notasEntrega'],
    dashboard_stats: ['ventas_hoy', 'productos_bajo_stock', 'marcas_mas_vendidas'],
    colores: { primary: '#8e44ad', secondary: '#6c3483' }
  },
  
  // 🛒 MINIMERCADO
  minimercado: {
    icono: "🛒",
    nombre: "Minimercado",
    modulos: {
      dashboard: true,
      productos: true,
      categorias: true,
      clientes: true,
      empleados: true,
      reportes: true,
      config: true,
      pedidos: true,
      punto_venta: true,
      codigo_barras: true,
      inventario: true,
      // No aplican
      mesas: false,
      comandas: false,
      fidelizacion: false,
      agenda: false,
      cotizaciones: false,
      delivery: false
    },
    campos_producto: ['codigoBarras', 'unidadMedida', 'stockMinimo', 'fechaVencimiento'],
    campos_pedido: ['metodoPago', 'descuentoAplicado', 'cajero'],
    dashboard_stats: ['ventas_hoy', 'transacciones', 'productos_agotados'],
    colores: { primary: '#27ae60', secondary: '#219653' }
  },

    // 🍦 HELADERÍA (NUEVO)
  heladeria: {
    icono: "🍦",
    nombre: "Heladería",
    tipo: "heladeria",  // ← IMPORTANTE: Agregar este campo
    modulos: {
      // Core - Siempre activos
      dashboard: true,
      productos: true,        // Helados, paletas, chococonos, etc.
      categorias: true,       // Helados, Paletas, Bebidas, Postres
      clientes: true,
      empleados: true,
      reportes: false,
      config: true,
      // Específicos de heladería
      inventario: true,       // Control de stock de ingredientes
      pedidos: true,          // Ventas de helados
      fidelizacion: true,     // Clientes frecuentes
      // No aplican
      mesas: false,
      comandas: false,
      cotizaciones: false,
      agenda: false,
      delivery: false,         // Delivery de helados
      barrios: true,
      punto_venta: false,
      codigo_barras: false,
      citas: false,
      servicios: false
    },
    // Campos específicos para productos de heladería
    campos_producto: [
      'precioCompra',        // Costo de producción
      'precioVenta',         // Precio al público
      'stock',               // Cantidad disponible
      'sabores',             // Array de sabores
      'tamaño',              // Pequeño, mediano, grande
      'tipoHelado',          // Crema, agua, yogurt, etc.
      'alergenos',           // Contiene lácteos, nueces, etc.
      'esVegano',            // Booleano
      'sinAzucar'            // Booleano
    ],
    // Campos específicos para pedidos
    campos_pedido: [
      'tipoEntrega',         // Local, domicilio
      'horaEntrega',
      'notasEspeciales',
      'metodoPago',
      'descuentoAplicado'
    ],
    // Stats para el dashboard
    dashboard_stats: [
      'ventas_hoy',
      'pedidos_pendientes',
      'productos_bajo_stock',
      'sabores_populares'
    ],
    // Colores de la marca (rosado helado)
    colores: { primary: '#FF6B9D', secondary: '#C44569' }
  },
  
  // 🏢 DEFAULT (fallback si no coincide ninguna vertical)
  default: {
    icono: "🏢",
    nombre: "Negocio",
    modulos: {
      dashboard: true,
      productos: true,
      categorias: true,
      clientes: true,
      empleados: true,
      reportes: true,
      config: true,
      // Todos los demás desactivados por defecto
      pedidos: false,
      mesas: false,
      comandas: false,
      fidelizacion: false,
      inventario: false,
      cotizaciones: false,
      agenda: false,
      delivery: false,
      punto_venta: false,
      codigo_barras: false,
      citas: false,
      servicios: false
    },
    campos_producto: [],
    campos_pedido: [],
    dashboard_stats: ['ventas_hoy', 'pedidos_hoy', 'pendientes', 'clientes'],
    colores: { primary: '#3498db', secondary: '#2980b9' }
  }
};

/**
 * Obtiene la configuración completa para un tipo de negocio
 * @param {string} tipo - Tipo de negocio (restaurante, peluqueria, alquileres_para_eventos, veterinaria, etc.)
 * @returns {Object} Configuración del negocio o default si no existe
 */
function getConfigByTipo(tipo) {
  return CONFIG_NEGOCIOS[tipo] || CONFIG_NEGOCIOS.default;
}

/**
 * Obtiene los módulos activos para un tipo de negocio
 * @param {string} tipo - Tipo de negocio
 * @returns {Object} Objeto con módulos activos (true/false)
 */
function getModulosByTipo(tipo) {
  const config = getConfigByTipo(tipo);
  return config.modulos;
}

/**
 * Verifica si un módulo está activo para un tipo de negocio
 * @param {string} tipo - Tipo de negocio
 * @param {string} modulo - Nombre del módulo
 * @returns {boolean} true si está activo
 */
function isModuloActivo(tipo, modulo) {
  const config = getConfigByTipo(tipo);
  return config.modulos[modulo] === true;
}

/**
 * Obtiene los campos personalizados para productos
 * @param {string} tipo - Tipo de negocio
 * @returns {Array} Array de nombres de campos
 */
function getCamposProducto(tipo) {
  const config = getConfigByTipo(tipo);
  return config.campos_producto || [];
}

/**
 * Obtiene los campos personalizados para pedidos
 * @param {string} tipo - Tipo de negocio
 * @returns {Array} Array de nombres de campos
 */
function getCamposPedido(tipo) {
  const config = getConfigByTipo(tipo);
  return config.campos_pedido || [];
}

/**
 * Obtiene las estadísticas para el dashboard
 * @param {string} tipo - Tipo de negocio
 * @returns {Array} Array de stats a mostrar
 */
function getDashboardStats(tipo) {
  const config = getConfigByTipo(tipo);
  return config.dashboard_stats || [];
}

/**
 * Obtiene los colores de marca para un tipo de negocio
 * @param {string} tipo - Tipo de negocio
 * @returns {Object} Objeto con colores primary y secondary
 */
function getColoresMarca(tipo) {
  const config = getConfigByTipo(tipo);
  return config.colores || { primary: '#3498db', secondary: '#2980b9' };
}

/**
 * Obtiene todos los tipos de negocio disponibles
 * @returns {Array} Array de objetos con id, nombre e icono
 */
function getTiposNegocioDisponibles() {
  return Object.entries(CONFIG_NEGOCIOS).map(([key, value]) => ({
    id: key,
    nombre: value.nombre,
    icono: value.icono,
    color: value.colores.primary
  })).filter(tipo => tipo.id !== 'default'); // Excluir default de la lista
}

// Exportar para usar en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG_NEGOCIOS,
    getConfigByTipo,
    getModulosByTipo,
    isModuloActivo,
    getCamposProducto,
    getCamposPedido,
    getDashboardStats,
    getColoresMarca,
    getTiposNegocioDisponibles
  };
}