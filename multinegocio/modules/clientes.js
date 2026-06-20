// modules/clientes.js - Gestión de Clientes/Contactos

import { ModuleEngine } from './module_engine.js';
import { Formatters } from '../utils/formatters.js';

export class ClientesModule extends ModuleEngine {
  constructor(config) {
    super({
      id: 'clientes',
      nombre: 'Clientes',
      icono: '👥',
      campos_base: ['nombre', 'email', 'telefono', 'direccion', 'notas'],
      campos_extra: config.campos_extra || [],
      estados: ['activo', 'inactivo'],
      ruta_db: 'negocios/{negocioId}/clientes',
      permisos: { crear: true, editar: true, eliminar: true },
      ...config
    });
  }

  // Columnas específicas para clientes
  getTableColumns() {
    return [
      { key: 'nombre', label: 'Nombre', width: '30%' },
      { key: 'email', label: 'Email', width: '30%' },
      { key: 'telefono', label: 'Teléfono', width: '20%' },
      { key: 'estado', label: 'Estado', format: 'badge', width: '20%' }
    ];
  }

  // Renderizado personalizado para mostrar contactos completos
  renderItem(item) {
    return `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.nombre || 'Sin nombre'}</strong>
            <div class="text-muted small">
              ${item.email ? `📧 ${item.email} | ` : ''}
              ${item.telefono ? `📱 ${item.telefono}` : ''}
              ${item.direccion ? `<br>📍 ${item.direccion}` : ''}
            </div>
          </div>
          <div class="text-end">
            ${Formatters.statusBadge(item.estado || 'activo')}
          </div>
        </div>
      </div>
    `;
  }
}