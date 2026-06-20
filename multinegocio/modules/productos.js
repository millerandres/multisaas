// modules/productos.js - Productos y Servicios (Extiende ModuleEngine)

import { ModuleEngine } from './module_engine.js';
import { Formatters } from '../utils/formatters.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class ProductosModule extends ModuleEngine {
  constructor(config) {
    super({
      id: 'productos',
      // Permite renombrar el módulo según el negocio (ej: "Servicios" en peluquería)
      nombre: config.nombreProducto || 'Productos', 
      icono: config.icono || '📦',
      campos_base: ['nombre', 'descripcion', 'precio', 'categoriaId', 'imagen'],
      campos_extra: config.campos_extra || [],
      estados: ['disponible', 'agotado', 'oculto'],
      ruta_db: 'negocios/{negocioId}/menu',
      permisos: { crear: true, editar: true, eliminar: true },
      ...config
    });
  }

  // 1. Filtros específicos: Categoría y Estado
  getFiltersConfig() {
    return [
      { 
        name: 'categoriaId', 
        label: 'Categoría', 
        type: 'select', 
        options: [], // Se llena dinámicamente
        width: 'half'
      },
      {
        name: 'estado',
        label: 'Estado',
        type: 'select',
        options: [
          { value: 'disponible', label: 'Disponible' },
          { value: 'agotado', label: 'Agotado' },
          { value: 'oculto', label: 'Oculto' }
        ],
        width: 'half'
      }
    ];
  }

  // 2. Columnas de la tabla
  getTableColumns() {
    return [
      { key: 'nombre', label: 'Producto/Servicio', width: '40%' },
      { key: 'categoriaNombre', label: 'Categoría', width: '20%' }, // Nombre legible
      { key: 'precio', label: 'Precio', format: 'currency', width: '20%' },
      { key: 'estado', label: 'Estado', format: 'badge', width: '20%' }
    ];
  }

  // 3. Renderizado personalizado del item (para mostrar imagen y precio grande)
  renderItem(item) {
    return `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <!-- Imagen con fallback -->
            ${item.imagen ? 
              `<img src="${item.imagen}" class="product-img-thumb" 
                     style="width:50px; height:50px; object-fit:cover; border-radius:8px;"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect fill=%22%23ddd%22 width=%22100%%22 height=%22100%%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22>📦</text></svg>'">` :
              `<div class="product-img-thumb bg-light d-flex align-items-center justify-content-center" style="width:50px; height:50px; border-radius:8px;">📦</div>`
            }
            <div>
              <strong>${item.nombre || 'Sin nombre'}</strong>
              <div class="text-muted small">${Formatters.truncate(item.descripcion || '', 50)}</div>
              ${item.categoriaNombre ? `<small class="text-primary">📂 ${item.categoriaNombre}</small>` : ''}
            </div>
          </div>
          <div class="text-end">
            <div class="fw-bold text-primary mb-1">${Formatters.currency(item.precio)}</div>
            ${Formatters.statusBadge(item.estado || 'disponible')}
          </div>
        </div>
      </div>
    `;
  }

  // 4. Lógica para cargar categorías en los selects
  async loadCategoriasOptions() {
    try {
      const snap = await FirebaseHelpers.ref(`negocios/${this.negocioId}/categorias`, this.negocioId).once('value');
      const options = [{ value: '', label: 'Todas las categorías' }];
      
      // Mapeo para buscar nombres más tarde
      this.categoriasMap = {};

      snap.forEach(c => {
        const cat = c.val();
        options.push({ value: c.key, label: cat.nombre });
        this.categoriasMap[c.key] = cat.nombre; // Guardar nombre para la tabla
      });
      
      // Actualizar filtro
      const filterSelect = document.querySelector('#filters-container [data-filter="categoriaId"]');
      if (filterSelect) {
        filterSelect.innerHTML = options.map(opt => 
          `<option value="${opt.value}">${opt.label}</option>`
        ).join('');
      }
      
      return options;
    } catch (err) {
      console.error('Error loading categories:', err);
      return [];
    }
  }

  // 5. Sobrescribir load para cargar categorías primero
  // ✅ Sobrescribir load para cargar desde menu/categoria/productos
// ✅ Sobrescribir load para cargar desde menu/categoria/productos
async load() {
  const listEl = document.getElementById('lista-productos');
  if (!listEl) {
    console.error('❌ lista-productos no encontrado');
    return;
  }
  
  listEl.innerHTML = '<div class="loading"><i class="bi bi-hourglass-split"></i> Cargando productos...</div>';
  
  try {
    console.log('🔄 Cargando productos para negocio:', this.negocioId);
    
    // Cargar menú completo (todas las categorías)
    const menuSnap = await window.db.ref(`negocios/${this.negocioId}/menu`).once('value');
    const menu = menuSnap.val() || {};
    
    console.log('📂 Menú recibido:', Object.keys(menu).length, 'categorías');
    
    const todosProductos = [];
    let categoriasConProductos = 0;
    
    // Recorrer cada categoría
    Object.entries(menu).forEach(([catId, categoria]) => {
      console.log(`📁 Categoría: ${categoria.nombre}`, categoria.productos ? Object.keys(categoria.productos).length : 0, 'productos');
      
      if (categoria.productos) {
        categoriasConProductos++;
        Object.entries(categoria.productos).forEach(([prodId, producto]) => {
          todosProductos.push({
            id: prodId,
            categoriaId: catId,
            categoriaNombre: categoria.nombre,
            categoriaIcono: categoria.icono || '📦',
            ...producto
          });
        });
      }
    });
    
    console.log('✅ Total de productos cargados:', todosProductos.length);
    console.log('Categorías con productos:', categoriasConProductos);
    
    if (todosProductos.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-box-seam" style="font-size: 4em; color: #cbd5e1;"></i>
          <h5 class="mt-3 text-muted">No hay productos registrados</h5>
          <p class="text-muted">Haz clic en "Nuevo Producto" para comenzar</p>
        </div>
      `;
      return;
    }
    
    // Aplicar filtros
    let productosFiltrados = todosProductos;
    
    // Filtro de búsqueda
    if (this.currentFilters && this.currentFilters.search) {
      const search = this.currentFilters.search.toLowerCase();
      productosFiltrados = productosFiltrados.filter(p => 
        (p.nombre || '').toLowerCase().includes(search) ||
        (p.descripcion || '').toLowerCase().includes(search)
      );
    }
    
    // Filtro de categoría
    if (this.currentFilters && this.currentFilters.categoriaId) {
      productosFiltrados = productosFiltrados.filter(p => 
        p.categoriaId === this.currentFilters.categoriaId
      );
    }
    
    // Filtro de estado
    if (this.currentFilters && this.currentFilters.estado) {
      productosFiltrados = productosFiltrados.filter(p => 
        p.estado === this.currentFilters.estado
      );
    }
    
    // Ordenar por nombre
    productosFiltrados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    
    console.log('📋 Productos después de filtros:', productosFiltrados.length);
    
    this.items = productosFiltrados;
    this.renderList(productosFiltrados);
    
  } catch (err) {
    console.error('❌ Error cargando productos:', err);
    listEl.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i>
        Error al cargar productos: ${err.message}
      </div>
    `;
  }
}

  // 6. Sobrescribir openForm para asegurar que el select tenga opciones
async openForm(id = null) {
  console.log('🔵 openForm llamado con id:', id);
  
  if (id) {
    // MODO EDICIÓN
    console.log('✏️ Editando producto:', id);
    if (typeof window.editarProducto === 'function') {
      // Buscar el producto en la lista
      const producto = this.items.find(p => p.id === id);
      if (producto) {
        await window.editarProducto(producto.categoriaId, producto.id);
      } else {
        window.showToast('Producto no encontrado', 'error');
      }
    } else {
      console.error('❌ window.editarProducto no está definido');
      window.showToast('Función de edición no disponible', 'error');
    }
  } else {
    // MODO CREACIÓN
    console.log('➕ Creando nuevo producto');
    if (typeof window.abrirModalProducto === 'function') {
      await window.abrirModalProducto();
    } else {
      console.error('❌ window.abrirModalProducto no está definido');
      window.showToast('Función de creación no disponible', 'error');
    }
  }
}

// ✅ Método para editar producto
async editarProducto(categoriaId, productoId) {
  console.log('✏️ Editando producto:', productoId, 'en categoría:', categoriaId);
  
  try {
    // Obtener datos del producto
    const snap = await window.db.ref(`negocios/${this.negocioId}/menu/${categoriaId}/productos/${productoId}`).once('value');
    const producto = snap.val();
    
    if (!producto) {
      window.showToast('Producto no encontrado', 'error');
      return;
    }
    
    console.log('📦 Producto encontrado:', producto);
    
    // Determinar qué modal abrir según el tipo de negocio
    const tipoNegocio = this.config?.tipo || '';
    const nombreNegocio = (this.config?.nombreNegocio || '').toLowerCase();
    
    const esVeterinaria = tipoNegocio === 'veterinaria' || 
                          nombreNegocio.includes('veterinaria') || 
                          nombreNegocio.includes('vet') || 
                          nombreNegocio.includes('mascota');
    
    const esHeladeria = tipoNegocio === 'heladeria' || 
                        nombreNegocio.includes('heladeria') || 
                        nombreNegocio.includes('helado') || 
                        nombreNegocio.includes('nieve') || 
                        nombreNegocio.includes('paleta') ||
                        nombreNegocio.includes('la emilia');
    
    if (esVeterinaria) {
      await this.editarProductoVeterinaria(categoriaId, productoId, producto);
    } else if (esHeladeria) {
      await this.editarProductoHeladeria(categoriaId, productoId, producto);
    } else {
      await this.editarProductoNormal(categoriaId, productoId, producto);
    }
    
  } catch (error) {
    console.error('❌ Error al editar producto:', error);
    window.showToast('Error: ' + error.message, 'error');
  }
}

// ✅ Editar producto normal
async editarProductoNormal(categoriaId, productoId, producto) {
  console.log('📦 Editando producto normal');
  
  const modalEl = document.getElementById('modalProducto');
  if (!modalEl) {
    window.showToast('Modal de producto no encontrado', 'error');
    return;
  }
  
  // Cargar categorías en el select
  const select = document.getElementById('prodCategoria');
  if (select) {
    select.innerHTML = '<option value="">Cargando categorías...</option>';
    try {
      const menuSnap = await window.db.ref(`negocios/${this.negocioId}/menu`).once('value');
      const menu = menuSnap.val() || {};
      select.innerHTML = '<option value="">Seleccione una categoría...</option>';
      Object.entries(menu).forEach(([id, cat]) => {
        if (cat && cat.activo !== false) {
          select.innerHTML += `<option value="${id}">${cat.icono || '📦'} ${cat.nombre}</option>`;
        }
      });
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  }
  
  // Abrir modal
  const existingInstance = bootstrap.Modal.getInstance(modalEl);
  if (existingInstance) existingInstance.dispose();
  
  const modalInstance = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true, focus: true });
  modalInstance.show();
  
  // Llenar campos después de que el modal esté visible
  setTimeout(() => {
    document.getElementById('prodNombre').value = producto.nombre || '';
    document.getElementById('prodDescripcion').value = producto.descripcion || '';
    document.getElementById('prodPrecioDia').value = producto.precioDia || 0;
    document.getElementById('prodDimensiones').value = producto.dimensiones || '';
    document.getElementById('prodStockTotal').value = producto.stockTotal || 0;
    
    if (select) select.value = categoriaId;
    
    // Mostrar imagen si existe
    const previewContainer = document.getElementById('prodImagenPreview');
    if (producto.imagen && previewContainer) {
      const imgSrc = producto.imagen + (producto.imagen.includes('?') ? '&' : '?') + 't=' + Date.now();
      previewContainer.innerHTML = `
        <div class="product-preview-container">
          <img src="${imgSrc}" class="product-preview-img" alt="Imagen actual">
          <div class="mt-2"><small class="text-muted">Sube una nueva imagen para reemplazarla</small></div>
        </div>
      `;
    }
    
    // Guardar IDs de edición en el formulario
    const form = document.getElementById('formProducto');
    if (form) {
      form.dataset.editCategoriaId = categoriaId;
      form.dataset.editProductoId = productoId;
    }
    
    const modalTitle = document.getElementById('modal-producto-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Editar Producto';
  }, 400);
}


// ✅ Editar producto heladería
async editarProductoHeladeria(categoriaId, productoId, producto) {
  console.log('🍦 Editando producto heladería');
  
  // Abrir modal primero
  if (typeof window.abrirModalProductoHeladeria === 'function') {
    await window.abrirModalProductoHeladeria();
  } else {
    window.showToast('Modal de heladería no disponible', 'error');
    return;
  }
  
  // Esperar a que el modal esté visible
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Llenar campos
  const nombreEl = document.getElementById('helProdNombre');
  const descripcionEl = document.getElementById('helProdDescripcion');
  const categoriaEl = document.getElementById('helProdCategoria');
  const porPaqueteEl = document.getElementById('helProdPorPaquete');
  const porUnidadEl = document.getElementById('helProdPorUnidad');
  const precioPaqueteEl = document.getElementById('helProdPrecioPaquete');
  const precioUnidadEl = document.getElementById('helProdPrecioUnidad');
  const previewContainer = document.getElementById('helProdImagenPreview');
  const modalTitle = document.getElementById('modal-producto-heladeria-title');
  const form = document.getElementById('formProductoHeladeria');
  
  if (nombreEl) nombreEl.value = producto.nombre || '';
  if (descripcionEl) descripcionEl.value = producto.descripcion || '';
  if (porPaqueteEl) porPaqueteEl.value = producto.porPaquete || 0;
  if (porUnidadEl) porUnidadEl.value = producto.porUnidad || 0;
  if (precioPaqueteEl) precioPaqueteEl.value = producto.precioPaquete || 0;
  if (precioUnidadEl) precioUnidadEl.value = producto.precioUnidad || 0;
  
  if (categoriaEl) categoriaEl.value = categoriaId;
  
  if (producto.imagen && previewContainer) {
    const imgSrc = producto.imagen + (producto.imagen.includes('?') ? '&' : '?') + 't=' + Date.now();
    previewContainer.innerHTML = `
      <div class="product-preview-container">
        <img src="${imgSrc}" class="product-preview-img" alt="Imagen actual">
        <div class="mt-2"><small class="text-muted">Sube una nueva imagen para reemplazarla</small></div>
      </div>
    `;
  }
  
  if (form) {
    form.dataset.editCategoriaId = categoriaId;
    form.dataset.editProductoId = productoId;
  }
  
  if (modalTitle) {
    modalTitle.innerHTML = '<i class="bi bi-cup-straw me-2"></i>Editar Producto - Heladería';
  }
}

renderModalProductos() {
    const modalContent = document.getElementById('modalAgregarProductosContent');
    if (!modalContent) return;

    // Agrupar productos por categoría
    const productosPorCategoria = {};
    
    this.items.forEach(producto => {
      const categoriaId = producto.categoriaId || 'sin-categoria';
      const categoriaNombre = producto.categoriaNombre || 'Sin Categoría';
      const categoriaIcono = producto.categoriaIcono || '📦';
      
      if (!productosPorCategoria[categoriaId]) {
        productosPorCategoria[categoriaId] = {
          nombre: categoriaNombre,
          icono: categoriaIcono,
          productos: []
        };
      }
      
      productosPorCategoria[categoriaId].productos.push(producto);
    });

    let html = '<div class="categorias-modal-container">';
    
    Object.entries(productosPorCategoria).forEach(([catId, categoria]) => {
      html += `
        <div class="categoria-section">
          <div class="categoria-header">
            <span class="categoria-icon">${categoria.icono}</span>
            <h5 class="categoria-title">${categoria.nombre}</h5>
            <span class="badge bg-primary">${categoria.productos.length}</span>
          </div>
          <div class="productos-grid">
            ${categoria.productos.map(prod => {
              const precio = this.obtenerPrecioProducto(prod);
              const imagenUrl = prod.imagen || null;
              
              return `
                <div class="producto-card" onclick="window.toggleProductoModal('${prod.id}')">
                  <div class="producto-checkbox">
                    <input type="checkbox" id="prod-${prod.id}" data-id="${prod.id}" onchange="event.stopPropagation(); window.toggleProductoModal('${prod.id}')">
                  </div>
                  <div class="producto-image-container">
                    ${imagenUrl 
                      ? `<img src="${imagenUrl}" alt="${prod.nombre}" class="producto-imagen" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'producto-imagen-placeholder\\'><i class=\\'bi bi-box-seam\\'></i></div>';">`
                      : `<div class="producto-imagen-placeholder"><i class="bi bi-box-seam"></i></div>`
                    }
                  </div>
                  <div class="producto-info">
                    <h6 class="producto-nombre">${prod.nombre}</h6>
                    <p class="producto-precio">$${precio.toLocaleString('es-CO')}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    modalContent.innerHTML = html;
  }

// ✅ Editar producto veterinaria
async editarProductoVeterinaria(categoriaId, productoId, producto) {
  console.log('🐾 Editando producto veterinaria');
  
  if (typeof window.abrirModalProductoVeterinaria === 'function') {
    await window.abrirModalProductoVeterinaria();
  } else {
    window.showToast('Modal de veterinaria no disponible', 'error');
    return;
  }
  
  setTimeout(() => {
    document.getElementById('vetProdNombre').value = producto.nombre || '';
    document.getElementById('vetProdDescripcion').value = producto.descripcion || '';
    document.getElementById('vetProdPrecioCompra').value = producto.precioCompra || 0;
    document.getElementById('vetProdPrecioVenta').value = producto.precioVenta || 0;
    document.getElementById('vetProdCantidad').value = producto.cantidad || 0;
    
    const select = document.getElementById('vetProdCategoria');
    if (select) select.value = categoriaId;
    
    if (typeof window.calcularMargen === 'function') {
      window.calcularMargen();
    }
    
    const previewContainer = document.getElementById('vetProdImagenPreview');
    if (producto.imagen && previewContainer) {
      const imgSrc = producto.imagen + (producto.imagen.includes('?') ? '&' : '?') + 't=' + Date.now();
      previewContainer.innerHTML = `
        <div class="product-preview-container">
          <img src="${imgSrc}" class="product-preview-img" alt="Imagen actual">
          <div class="mt-2"><small class="text-muted">Sube una nueva imagen para reemplazarla</small></div>
        </div>
      `;
    }
    
    const form = document.getElementById('formProductoVeterinaria');
    if (form) {
      form.dataset.editCategoriaId = categoriaId;
      form.dataset.editProductoId = productoId;
    }
    
    const modalTitle = document.getElementById('modal-producto-vet-title');
    if (modalTitle) modalTitle.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Editar Producto Veterinaria';
  }, 500);
}


}



window.editarProductoDesdeModulo = function(categoriaId, productoId) {
  if (window.modules?.productos) {
    window.modules.productos.editarProducto(categoriaId, productoId);
  } else {
    window.showToast('Módulo de productos no disponible', 'error');
  }
};