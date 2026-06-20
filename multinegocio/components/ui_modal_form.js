// components/ui_modal_form.js - Componente de Modal con Formulario (CORREGIDO)

export class UIModalForm {
  
  static _cleanupHandlers = new Map();
  static _modalsInDOM = new Set();
  static _modalInstances = new Map();

  static create(config) {
    const {
      id = 'modal-form',
      title = 'Formulario',
      fields = [],
      size = 'lg',
      static: isStatic = false
    } = config;

    // ✅ NO CREAR SI YA EXISTE EN EL DOM
    const existingModal = document.getElementById(id);
    if (existingModal) {
      console.log(`♻️ Modal ${id} ya existe en el DOM, no se creará duplicado`);
      return existingModal.outerHTML;
    }

    const sizeClass = {
      sm: 'modal-sm',
      md: '',
      lg: 'modal-lg',
      xl: 'modal-xl'
    }[size] || '';

    const staticAttrs = isStatic 
      ? 'data-bs-backdrop="static" data-bs-keyboard="false"' 
      : 'data-bs-backdrop="true" data-bs-keyboard="true"';

    const modalHTML = `
      <div class="modal fade" id="${id}" tabindex="-1" ${staticAttrs} aria-hidden="true">
        <div class="modal-dialog ${sizeClass} modal-dialog-centered">
          <div class="modal-content">
            <form id="form-${id}">
              <div class="modal-header">
                <h5 class="modal-title" id="${id}-title">${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                ${this._renderFields(fields)}
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">💾 Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    console.log(`🔵 Creando modal: ${id}`);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHTML;
    const modalElement = tempDiv.firstElementChild;
    document.body.appendChild(modalElement);
    this._modalsInDOM.add(id);
    
    console.log(`✅ Modal ${id} agregado al DOM`);

    return modalHTML;
  }

  static _renderFields(fields) {
    return `
      <div class="row g-3">
        ${fields.map(field => {
          const colClass = field.fullWidth ? 'col-12' : field.width === 'half' ? 'col-md-6' : 'col-md-4';
          const required = field.required ? 'required' : '';
          const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
          
          if (field.type === 'file' && field.name === 'imagen') {
            return `
              <div class="${colClass}">
                <label class="form-label">${field.label} ${required ? '<span class="text-danger">*</span>' : ''}</label>
                <input type="file" class="form-control" name="${field.name}" accept="${field.accept || 'image/*'}" 
                       id="file-${field.name}" ${required}>
                <div class="image-preview-container mt-2" id="preview-${field.name}" style="display: none;">
                  <img src="" alt="Vista previa" class="image-preview" style="max-width: 200px; border-radius: 8px;">
                  <button type="button" class="btn btn-sm btn-danger mt-2" onclick="window.UIModalForm.removePreview('preview-${field.name}', 'file-${field.name}')">
                    🗑️ Eliminar imagen
                  </button>
                </div>
                ${field.help ? `<small class="form-text text-muted">${field.help}</small>` : ''}
              </div>
            `;
          }
          
          switch(field.type) {
            case 'textarea':
              return `
                <div class="${colClass}">
                  <label class="form-label">${field.label} ${required ? '<span class="text-danger">*</span>' : ''}</label>
                  <textarea class="form-control" name="${field.name}" rows="${field.rows || 3}" 
                            ${required} ${placeholder}>${field.value || ''}</textarea>
                </div>
              `;
            
            case 'select':
              return `
                <div class="${colClass}">
                  <label class="form-label">${field.label} ${required ? '<span class="text-danger">*</span>' : ''}</label>
                  <select class="form-select" name="${field.name}" ${required}>
                    <option value="">Seleccione...</option>
                    ${field.options.map(opt => `
                      <option value="${opt.value}" ${opt.value === field.value ? 'selected' : ''}>
                        ${opt.label}
                      </option>
                    `).join('')}
                  </select>
                </div>
              `;
            
            case 'file':
              return `
                <div class="${colClass}">
                  <label class="form-label">${field.label} ${required ? '<span class="text-danger">*</span>' : ''}</label>
                  <input type="file" class="form-control" name="${field.name}" accept="${field.accept || '*'}" ${required}>
                  ${field.help ? `<small class="form-text text-muted">${field.help}</small>` : ''}
                </div>
              `;
            
            case 'checkbox':
              return `
                <div class="${colClass}">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="${field.name}" 
                           id="${field.name}" ${field.value ? 'checked' : ''}>
                    <label class="form-check-label" for="${field.name}">${field.label}</label>
                  </div>
                </div>
              `;
            
            case 'radio':
              return `
                <div class="${colClass}">
                  <label class="form-label">${field.label}</label>
                  <div>
                    ${field.options.map((opt, i) => `
                      <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="${field.name}" 
                               value="${opt.value}" id="${field.name}-${i}" 
                               ${opt.value === field.value ? 'checked' : ''}>
                        <label class="form-check-label" for="${field.name}-${i}">${opt.label}</label>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            
            default:
              return `
                <div class="${colClass}">
                  <label class="form-label">${field.label} ${required ? '<span class="text-danger">*</span>' : ''}</label>
                  <input type="${field.type || 'text'}" class="form-control" name="${field.name}" 
                         value="${field.value || ''}" ${required} ${placeholder}>
                  ${field.help ? `<small class="form-text text-muted">${field.help}</small>` : ''}
                </div>
              `;
          }
        }).join('')}
      </div>
    `;
  }

  static previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    const img = preview.querySelector('img');
    
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        img.src = e.target.result;
        preview.style.display = 'block';
      };
      
      reader.readAsDataURL(input.files[0]);
    }
  }

  static removePreview(previewId, fileId) {
    const preview = document.getElementById(previewId);
    const fileInput = document.getElementById(fileId);
    
    if (preview) {
      preview.style.display = 'none';
      const img = preview.querySelector('img');
      if (img) img.src = '';
    }
    if (fileInput) fileInput.value = '';
  }

  static _cleanupBackdrop() {
    // ✅ NO ELIMINAR BACKDROPS ACTIVOS
    setTimeout(() => {
      const activeModals = document.querySelectorAll('.modal.show');
      if (activeModals.length === 0) {
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    }, 300);
  }

  static open(modalId, data = {}) {
    console.log('🔵 UIModalForm.open() llamado para:', modalId);
    
    const modalEl = document.getElementById(modalId);
    
    if (!modalEl) {
      console.error(`❌ Modal ${modalId} no encontrado en el DOM`);
      return null;
    }
    
    // ✅ VERIFICAR SI YA TIENE INSTANCIA
    let modal = this._modalInstances.get(modalId);
    
    if (!modal) {
      modal = bootstrap.Modal.getInstance(modalEl);
    }
    
    // ✅ CREAR INSTANCIA SI NO EXISTE
    if (!modal) {
      modal = new bootstrap.Modal(modalEl, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
      this._modalInstances.set(modalId, modal);
    }
    
    // ✅ LLENAR DATOS
    if (Object.keys(data).length) {
      setTimeout(() => {
        Object.entries(data).forEach(([key, value]) => {
          const field = document.querySelector(`#form-${modalId} [name="${key}"]`);
          if (field) {
            if (field.type === 'checkbox') {
              field.checked = value;
            } else if (field.type === 'file' && value) {
              const previewId = `preview-${key}`;
              const preview = document.getElementById(previewId);
              if (preview) {
                const img = preview.querySelector('img');
                img.src = value;
                preview.style.display = 'block';
              }
            } else {
              field.value = value;
            }
          }
        });
      }, 100);
    }
    
    console.log('✅ Mostrando modal:', modalId);
    modal.show();
    
    return modal;
  }

  static close(modalId) {
    console.log('🔴 Cerrando modal:', modalId);
    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
      console.warn(`⚠️ Modal ${modalId} no encontrado`);
      return;
    }
    
    const modal = this._modalInstances.get(modalId) || bootstrap.Modal.getInstance(modalEl);
    
    if (modal) {
      modal.hide();
    }
  }

  static destroy(modalId) {
    console.log('🗑️ Destroying modal:', modalId);
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;
    
    const modal = this._modalInstances.get(modalId);
    
    if (modal) {
      modal.hide();
      
      setTimeout(() => {
        try {
          modal.dispose();
        } catch (e) {
          console.warn('Error disposing modal:', e);
        }
        this._modalInstances.delete(modalId);
        this._cleanupBackdrop();
      }, 150);
    }
  }

  static getData(modalId) {
    const form = document.getElementById(`form-${modalId}`);
    if (!form) {
      console.error(`Formulario form-${modalId} no encontrado`);
      return {};
    }
    
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      data[cb.name] = cb.checked;
    });
    
    return data;
  }

  static validate(modalId) {
    const form = document.getElementById(`form-${modalId}`);
    if (!form) return false;
    
    return form.checkValidity();
  }

  static exists(modalId) {
    return !!document.getElementById(modalId);
  }

  static getInstance(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return null;
    return this._modalInstances.get(modalId) || bootstrap.Modal.getInstance(modalEl);
  }
}

// ✅ HACER UIModalForm GLOBAL
window.UIModalForm = UIModalForm;