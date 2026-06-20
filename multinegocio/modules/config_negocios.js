// modules/config_negocio.js - Configuración del negocio

import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class ConfigNegocioModule {
  constructor(config) {
    this.config = {
      campos: [
        { key: 'nombre', label: 'Nombre del Negocio', type: 'text', required: true },
        { key: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '573001234567' },
        { key: 'direccion', label: 'Dirección', type: 'text' },
        { key: 'telefono', label: 'Teléfono', type: 'tel' },
        { key: 'tema', label: 'Tema Visual', type: 'select', options: [
          { value: 'light', label: '⚪ Claro' },
          { value: 'dark', label: '⚫ Oscuro' },
          { value: 'primary', label: '🔵 Color principal' }
        ]},
        { key: 'horario', label: 'Horario de Atención', type: 'text', placeholder: 'Lun-Sab 9:00 AM - 8:00 PM' }
      ],
      ...config
    };
    this.negocioId = null;
  }

  init(negocioId) {
    this.negocioId = negocioId;
    this.render();
    this.bindEvents();
    this.load();
  }

  render() {
    const container = document.getElementById('module-config');
    if (!container) return;

    const fieldsHtml = this.config.campos.map(campo => {
      if (campo.type === 'select') {
        return `
          <div class="col-md-6">
            <label class="form-label">${campo.label}</label>
            <select class="form-select" name="${campo.key}" id="config-${campo.key}">
              ${campo.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
            </select>
          </div>
        `;
      }
      return `
        <div class="col-md-6">
          <label class="form-label">${campo.label}</label>
          <input type="${campo.type}" class="form-control" 
                 name="${campo.key}" id="config-${campo.key}" 
                 placeholder="${campo.placeholder || ''}" 
                 ${campo.required ? 'required' : ''}>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <h4 class="mb-4">⚙️ Configuración del Negocio</h4>
      <div class="card p-4">
        <form id="form-config">
          <div class="row g-3">
            ${fieldsHtml}
          </div>
          <button type="submit" class="btn btn-success mt-4">💾 Guardar Cambios</button>
        </form>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('form-config')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.save();
    });
  }

  async load() {
    try {
      const snap = await FirebaseHelpers.ref(`negocios/${this.negocioId}`, this.negocioId).once('value');
      const data = snap.val();
      
      this.config.campos.forEach(campo => {
        const el = document.getElementById(`config-${campo.key}`);
        if (el && data[campo.key] !== undefined) {
          el.value = data[campo.key];
        }
      });
    } catch (err) {
      console.error('Error loading config:', err);
    }
  }

  async save() {
    const data = {};
    this.config.campos.forEach(campo => {
      const el = document.getElementById(`config-${campo.key}`);
      if (el) data[campo.key] = el.value;
    });
    
    try {
      await FirebaseHelpers.ref(`negocios/${this.negocioId}`, this.negocioId).update({
        ...data,
        actualizadoEn: Date.now()
      });
      alert('✅ Configuración guardada');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }
}