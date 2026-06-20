// modules/empleados.js - Gestión de Empleados con Auth

import { ModuleEngine } from './module_engine.js';
import { Formatters } from '../utils/formatters.js';
import { FirebaseHelpers } from '../utils/firebase_helpers.js';

export class EmpleadosModule extends ModuleEngine {
  constructor(config) {
    super({
      id: 'empleados',
      nombre: 'Empleados',
      icono: '👷',
      campos_base: ['nombre', 'email', 'rol', 'telefono'],
      campos_extra: config.campos_extra || [],
      estados: ['activo', 'inactivo'],
      ruta_db: 'negocios/{negocioId}/usuarios',
      permisos: { crear: true, editar: true, eliminar: true },
      ...config
    });
    this.isEditing = false;
  }

  // Agrega campo de contraseña solo al crear (no al editar)
  getFormFields() {
    const fields = super.getFormFields();
    
    if (!this.isEditing) {
      fields.push({
        name: 'password',
        label: 'Contraseña Temporal',
        type: 'password',
        required: true,
        help: 'Mínimo 6 caracteres. El empleado podrá cambiarla después.',
        width: 'half'
      });
    }
    
    return fields;
  }

  getTableColumns() {
    return [
      { key: 'nombre', label: 'Nombre', width: '30%' },
      { key: 'email', label: 'Correo', width: '35%' },
      { key: 'rol', label: 'Rol', format: 'badge', width: '20%' },
      { key: 'activo', label: 'Estado', format: 'badge', width: '15%' }
    ];
  }

  // Renderiza items con badges de rol y oculta al dueño
  renderItem(item) {
    if (item.rol === 'owner') return ''; // No mostrar al dueño en la lista

    const roleConfig = {
      admin: { icon: '🔑', label: 'Admin', color: 'primary' },
      empleado: { icon: '👤', label: 'Empleado', color: 'secondary' },
      cajero: { icon: '💰', label: 'Cajero', color: 'info' }
    };
    const role = roleConfig[item.rol] || { icon: '👤', label: item.rol, color: 'secondary' };

    return `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.nombre || 'Sin nombre'}</strong>
            <div class="text-muted small">
              📧 ${item.email} | 📱 ${item.telefono || 'N/A'}
            </div>
          </div>
          <div class="text-end">
            <span class="badge bg-${role.color} me-2">${role.icon} ${role.label}</span>
            ${Formatters.statusBadge(item.activo !== false ? 'activo' : 'inactivo')}
          </div>
        </div>
      </div>
    `;
  }

  // Rastrea si estamos editando para controlar el campo password
  openForm(id = null) {
    this.isEditing = !!id;
    super.openForm(id);
  }

  // Sobrescribe save para manejar Auth + Base de Datos
  async save() {
    const modalId = `modal-${this.config.id}`;
    const form = document.getElementById(`form-${modalId}`);
    const editId = form?.dataset.editId;
    this.isEditing = !!editId;
    
    if (!form) return;

    if (!UIModalForm.validate(modalId)) {
      form.reportValidity();
      return;
    }

    const data = UIModalForm.getData(modalId);
    const password = data.password;

    try {
      if (editId) {
        // ACTUALIZAR: Solo actualiza la BD
        await FirebaseHelpers.update({
          path: this.config.ruta_db,
          negocioId: this.negocioId,
          id: editId,
          data: { ...data, actualizadoEn: Date.now() }
        });
        
        // Actualizar también en usuarios globales
        await db.ref(`usuarios/${editId}`).update({
          nombre: data.nombre,
          email: data.email,
          rol: data.rol,
          telefono: data.telefono,
          actualizadoEn: Date.now()
        });

        alert('✅ Empleado actualizado correctamente');
        
      } else {
        // CREAR: Auth + BD Global + BD Negocio
        if (!password || password.length < 6) {
          alert('❌ La contraseña debe tener al menos 6 caracteres');
          return;
        }

        // 1. Crear usuario en Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(data.email, password);
        const uid = userCredential.user.uid;

        // 2. Guardar datos globales del usuario
        await db.ref(`usuarios/${uid}`).set({
          email: data.email,
          nombre: data.nombre,
          rol: data.rol,
          telefono: data.telefono,
          negocioId: this.negocioId,
          activo: data.activo !== false,
          creadoEn: Date.now()
        });

        // 3. Guardar datos específicos del negocio
        const rutaNegocio = this.config.ruta_db.replace('{negocioId}', this.negocioId);
        await db.ref(rutaNegocio).child(uid).set({
          uid: uid,
          email: data.email,
          nombre: data.nombre,
          rol: data.rol,
          telefono: data.telefono,
          permisos: data.rol === 'admin' ? ['all'] : ['ver_pedidos', 'crear_pedidos'],
          activo: data.activo !== false,
          creadoEn: Date.now()
        });

        alert('✅ Empleado creado exitosamente. Puede iniciar sesión con su correo y contraseña.');
      }

      UIModalForm.close(modalId);
      this.load();

    } catch (err) {
      let errorMsg = err.message;
      if (err.code === 'auth/email-already-in-use') errorMsg = 'El correo ya está registrado en otro negocio.';
      if (err.code === 'auth/invalid-email') errorMsg = 'Correo electrónico inválido.';
      if (err.code === 'auth/weak-password') errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      
      alert('❌ Error: ' + errorMsg);
      console.error('Empleado save error:', err);
    }
  }

  // Filtra al owner al cargar
  async load() {
    await super.load();
    // Opcional: Filtrar items en memoria para que no aparezcan en la tabla
    if (this.items) {
      this.items = this.items.filter(item => item.rol !== 'owner');
      this.renderList(this.items);
    }
  }
}