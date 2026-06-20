// utils/firebase_helpers.js - Helpers centralizados para operaciones con Firebase
// Compatible con Firebase SDK v10.8.0 (Compat)

/**
 * Objeto de helpers para operaciones comunes con Firebase Realtime Database
 * Todos los métodos manejan {negocioId} dinámico y incluyen manejo de errores
 */
export const FirebaseHelpers = {
  /**
   * Obtiene referencia a una ruta de Firebase con reemplazo de variables
   * @param {string} path - Ruta con placeholder {negocioId}
   * @param {string} negocioId - ID del negocio actual
   * @returns {firebase.database.Reference} Referencia de Firebase
   */
  ref: (path, negocioId) => {
    if (!window.db) {
      console.error('❌ Firebase Database no está inicializado');
      throw new Error('Firebase no está disponible');
    }
    const resolvedPath = path.replace('{negocioId}', negocioId || '');
    return window.db.ref(resolvedPath);
  },

  /**
   * Lista items de una colección con opciones de ordenamiento y filtros
   * @param {Object} options - Configuración de la consulta
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} [options.orderBy='creadoEn'] - Campo para ordenar
   * @param {string} [options.order='desc'] - 'asc' o 'desc'
   * @param {number} [options.limit=50] - Límite de resultados
   * @param {Object} [options.filters={}] - Filtros clave-valor
   * @param {string} [options.startAt] - Valor mínimo para el campo ordenado
   * @param {string} [options.endAt] - Valor máximo para el campo ordenado
   * @returns {Promise<Array>} Array de items con {id, ...data}
   */
  async list({
    path,
    negocioId,
    orderBy = 'creadoEn',
    order = 'desc',
    limit = 50,
    filters = {},
    startAt = null,
    endAt = null
  }) {
    try {
      let query = FirebaseHelpers.ref(path, negocioId);
      
      // Aplicar ordenamiento si hay campo válido
      if (orderBy) {
        query = query.orderByChild(orderBy);
      }
      
      // Aplicar rango de fechas si se especifica
      if (startAt !== null) query = query.startAt(startAt);
      if (endAt !== null) query = query.endAt(endAt);
      
      // Aplicar límite según dirección
      if (order === 'desc') {
        query = query.limitToLast(limit);
      } else {
        query = query.limitToFirst(limit);
      }
      
      const snapshot = await query.once('value');
      const items = [];
      
      snapshot.forEach(child => {
        const data = child.val();
        if (!data) return;
        
        data.id = child.key;
        
        // Aplicar filtros adicionales en memoria (para campos no indexados)
        let match = true;
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            // Filtro "IN": el valor debe estar en el array
            if (!value.includes(data[key])) match = false;
          } else if (value !== null && data[key] !== value) {
            // Filtro de igualdad
            match = false;
          }
        });
        
        if (match) items.push(data);
      });
      
      // Si ordenamos por 'desc' con limitToLast, Firebase devuelve al revés
      return order === 'desc' ? items.reverse() : items;
      
    } catch (error) {
      console.error(`❌ Error en list() para ${path}:`, error);
      throw error;
    }
  },

  /**
   * Crea un nuevo registro con timestamps automáticos
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {Object} options.data - Datos a guardar
   * @param {boolean} [options.addTimestamps=true] - Agregar creadoEn/actualizadoEn
   * @returns {Promise<string>} ID del nuevo registro creado
   */
  async create({ path, negocioId, data, addTimestamps = true }) {
    try {
      const ref = FirebaseHelpers.ref(path, negocioId).push();
      
      const dataToSave = addTimestamps 
        ? {
            ...data,
            creadoEn: Date.now(),
            actualizadoEn: Date.now()
          }
        : data;
      
      await ref.set(dataToSave);
      return ref.key;
      
    } catch (error) {
      console.error(`❌ Error en create() para ${path}:`, error);
      throw error;
    }
  },

  /**
   * Actualiza un registro existente con timestamp de actualización
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} options.id - ID del registro a actualizar
   * @param {Object} options.data - Datos a actualizar (merge)
   * @param {boolean} [options.addTimestamp=true] - Agregar actualizadoEn
   */
  async update({ path, negocioId, id, data, addTimestamp = true }) {
    try {
      const dataToUpdate = addTimestamp
        ? { ...data, actualizadoEn: Date.now() }
        : data;
      
      await FirebaseHelpers.ref(path, negocioId).child(id).update(dataToUpdate);
      
    } catch (error) {
      console.error(`❌ Error en update() para ${path}/${id}:`, error);
      throw error;
    }
  },

  /**
   * Elimina un registro por ID
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} options.id - ID del registro a eliminar
   */
  async delete({ path, negocioId, id }) {
    try {
      await FirebaseHelpers.ref(path, negocioId).child(id).remove();
    } catch (error) {
      console.error(`❌ Error en delete() para ${path}/${id}:`, error);
      throw error;
    }
  },

  /**
   * Obtiene un solo registro por ID
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} options.id - ID del registro
   * @returns {Promise<Object|null>} Datos del registro o null si no existe
   */
  async get({ path, negocioId, id }) {
    try {
      const snapshot = await FirebaseHelpers.ref(path, negocioId).child(id).once('value');
      if (!snapshot.exists()) return null;
      
      const data = snapshot.val();
      return { id, ...data };
    } catch (error) {
      console.error(`❌ Error en get() para ${path}/${id}:`, error);
      throw error;
    }
  },

  /**
   * Escucha cambios en tiempo real con callback
   * IMPORTANTE: Retorna función de cleanup para evitar memory leaks
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} [options.orderBy] - Campo para ordenar (opcional)
   * @param {string} [options.event='value'] - Tipo de evento: 'value', 'child_added', etc.
   * @param {Function} options.callback - Función a ejecutar con los datos
   * @returns {Function} Función de cleanup para remover el listener
   */
  onValue({ path, negocioId, orderBy = null, event = 'value', callback }) {
    try {
      let query = FirebaseHelpers.ref(path, negocioId);
      if (orderBy) query = query.orderByChild(orderBy);
      
      const handler = (snapshot) => {
        const items = [];
        snapshot.forEach(child => {
          const data = child.val();
          if (data) {
            data.id = child.key;
            items.push(data);
          }
        });
        callback(items, snapshot);
      };
      
      query.on(event, handler);
      
      // Retornar función de cleanup
      return () => {
        query.off(event, handler);
      };
      
    } catch (error) {
      console.error(`❌ Error en onValue() para ${path}:`, error);
      return () => {}; // Retornar noop si hay error
    }
  },

  /**
   * Escucha un solo registro en tiempo real
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} options.id - ID del registro
   * @param {Function} options.callback - Callback con el dato o null
   * @returns {Function} Función de cleanup
   */
  onValueSingle({ path, negocioId, id, callback }) {
    try {
      const ref = FirebaseHelpers.ref(path, negocioId).child(id);
      
      const handler = (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        const data = snapshot.val();
        callback({ id, ...data });
      };
      
      ref.on('value', handler);
      
      return () => ref.off('value', handler);
    } catch (error) {
      console.error(`❌ Error en onValueSingle():`, error);
      return () => {};
    }
  },

  /**
   * Ejecuta una transacción atómica en Firebase
   * Útil para contadores, inventarios, o operaciones que requieren consistencia
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} options.id - ID del registro (opcional, si es null opera en la raíz de path)
   * @param {Function} options.transactionFn - Función que recibe el valor actual y retorna el nuevo
   * @returns {Promise<Object>} Resultado de la transacción {committed, snapshot}
   */
  async transaction({ path, negocioId, id = null, transactionFn }) {
    try {
      const ref = id 
        ? FirebaseHelpers.ref(path, negocioId).child(id)
        : FirebaseHelpers.ref(path, negocioId);
      
      const result = await ref.transaction(transactionFn);
      return {
        committed: result.committed,
        snapshot: result.snapshot ? { id: result.snapshot.key, ...result.snapshot.val() } : null
      };
    } catch (error) {
      console.error(`❌ Error en transaction() para ${path}:`, error);
      throw error;
    }
  },

  /**
   * Incrementa un valor numérico en Firebase (wrapper de transaction)
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} options.id - ID del registro
   * @param {string} options.field - Campo numérico a incrementar
   * @param {number} [options.amount=1] - Cantidad a sumar (puede ser negativa)
   * @returns {Promise<number>} Nuevo valor del campo
   */
  async increment({ path, negocioId, id, field, amount = 1 }) {
    try {
      const ref = FirebaseHelpers.ref(path, negocioId).child(id);
      
      const result = await ref.transaction(current => {
        if (current === null) return { [field]: amount };
        const currentVal = current[field] || 0;
        return { ...current, [field]: currentVal + amount };
      });
      
      if (!result.committed) {
        throw new Error('Transacción no confirmada');
      }
      
      return result.snapshot.val()?.[field] || amount;
    } catch (error) {
      console.error(`❌ Error en increment() para ${field}:`, error);
      throw error;
    }
  },

  /**
   * Busca registros por un campo con búsqueda parcial (case-insensitive)
   * NOTA: Para búsquedas complejas, considerar usar Firebase Firestore o Algolia
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} options.field - Campo a buscar
   * @param {string} options.query - Texto a buscar
   * @param {number} [options.limit=20] - Límite de resultados
   * @returns {Promise<Array>} Resultados que coinciden
   */
  async search({ path, negocioId, field, query, limit = 20 }) {
    try {
      const snapshot = await FirebaseHelpers.ref(path, negocioId).once('value');
      const results = [];
      const searchLower = query.toLowerCase().trim();
      
      snapshot.forEach(child => {
        if (results.length >= limit) return;
        
        const data = child.val();
        if (!data || !data[field]) return;
        
        const fieldValue = String(data[field]).toLowerCase();
        if (fieldValue.includes(searchLower)) {
          results.push({ id: child.key, ...data });
        }
      });
      
      return results;
    } catch (error) {
      console.error(`❌ Error en search() para ${field}:`, error);
      throw error;
    }
  },

  /**
   * Sube un archivo a Firebase Storage y retorna la URL pública
   * @param {File} file - Archivo a subir
   * @param {string} folder - Carpeta destino en Storage (ej: 'productos', 'categorias')
   * @param {string} [customName] - Nombre personalizado para el archivo (opcional)
   * @returns {Promise<string>} URL de descarga pública
   */
  async uploadFile(file, folder, customName = null) {
    if (!window.storage) {
      throw new Error('Firebase Storage no está inicializado');
    }
    
    if (!file || !(file instanceof File)) {
      throw new Error('Archivo inválido');
    }
    
    try {
      // Validar tamaño (máx 5MB por defecto)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(`El archivo excede el límite de 5MB`);
      }
      
      // Validar tipo (imágenes por defecto)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (file.type && !allowedTypes.includes(file.type)) {
        throw new Error(`Tipo de archivo no permitido: ${file.type}`);
      }
      
      // Generar nombre único
      const ext = file.name.split('.').pop();
      const fileName = customName || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
      const filePath = `${folder}/${fileName}`;
      
      // Subir archivo
      const storageRef = window.storage.ref(filePath);
      const uploadTask = await storageRef.put(file);
      
      // Obtener URL pública
      const downloadURL = await storageRef.getDownloadURL();
      
      return downloadURL;
      
    } catch (error) {
      console.error('❌ Error en uploadFile():', error);
      throw error;
    }
  },

  /**
   * Elimina un archivo de Firebase Storage por URL
   * @param {string} fileUrl - URL del archivo a eliminar
   * @returns {Promise<void>}
   */
  async deleteFile(fileUrl) {
    if (!window.storage) {
      throw new Error('Firebase Storage no está inicializado');
    }
    
    try {
      // Extraer path de la URL de Firebase Storage
      // Formato: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?token=...
      const urlParts = fileUrl.split('/o/');
      if (urlParts.length < 2) {
        throw new Error('URL de Storage inválida');
      }
      
      const pathWithToken = urlParts[1];
      const filePath = decodeURIComponent(pathWithToken.split('?')[0]);
      
      const storageRef = window.storage.ref(filePath);
      await storageRef.delete();
      
    } catch (error) {
      console.error('❌ Error en deleteFile():', error);
      throw error;
    }
  },

  /**
   * Verifica si un registro existe sin descargar todos sus datos
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {string} [options.id] - ID del registro (opcional)
   * @returns {Promise<boolean>} true si existe, false si no
   */
  async exists({ path, negocioId, id = null }) {
    try {
      const ref = id 
        ? FirebaseHelpers.ref(path, negocioId).child(id)
        : FirebaseHelpers.ref(path, negocioId);
      
      const snapshot = await ref.once('value');
      return snapshot.exists();
    } catch (error) {
      console.error(`❌ Error en exists() para ${path}:`, error);
      return false;
    }
  },

  /**
   * Cuenta registros en una colección (con filtros opcionales)
   * @param {Object} options - Configuración
   * @param {string} options.path - Ruta base con {negocioId}
   * @param {string} options.negocioId - ID del negocio
   * @param {Object} [options.filters={}] - Filtros clave-valor
   * @returns {Promise<number>} Número de registros que coinciden
   */
  async count({ path, negocioId, filters = {} }) {
    try {
      const snapshot = await FirebaseHelpers.ref(path, negocioId).once('value');
      let count = 0;
      
      snapshot.forEach(child => {
        const data = child.val();
        if (!data) return;
        
        // Aplicar filtros
        let match = true;
        Object.entries(filters).forEach(([key, value]) => {
          if (data[key] !== value) match = false;
        });
        
        if (match) count++;
      });
      
      return count;
    } catch (error) {
      console.error(`❌ Error en count() para ${path}:`, error);
      throw error;
    }
  },

  /**
   * Remueve todos los listeners de una referencia (útil para cleanup en componentes)
   * @param {string} path - Ruta base con {negocioId}
   * @param {string} negocioId - ID del negocio
   * @param {string} [event='value'] - Tipo de evento a remover (default: todos)
   */
  offAll(path, negocioId, event = null) {
    try {
      const ref = FirebaseHelpers.ref(path, negocioId);
      if (event) {
        ref.off(event);
      } else {
        ref.off(); // Remueve todos los eventos
      }
    } catch (error) {
      console.warn(`⚠️ Warning en offAll() para ${path}:`, error);
    }
  }
};

/**
 * Utilidades adicionales para manejo de datos
 */
export const FirebaseUtils = {
  /**
   * Convierte timestamp de Firebase a Date de JavaScript
   * @param {number|Object} timestamp - Timestamp en ms o objeto {seconds, nanoseconds}
   * @returns {Date|null} Objeto Date o null si es inválido
   */
  toDate: (timestamp) => {
    if (!timestamp) return null;
    
    // Manejar objeto de Firestore {seconds, nanoseconds}
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Manejar número (milisegundos)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    return null;
  },

  /**
   * Formatea timestamp para mostrar en UI
   * @param {number|Object} timestamp 
   * @param {string} [locale='es-CO'] - Locale para Intl
   * @returns {string} Fecha formateada
   */
  formatDate: (timestamp, locale = 'es-CO') => {
    const date = FirebaseUtils.toDate(timestamp);
    if (!date) return '—';
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  /**
   * Genera ID único para documentos (alternativa a push().key)
   * @returns {string} ID único
   */
  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Sanitiza datos antes de guardar en Firebase
   * Remueve propiedades undefined y convierte valores inválidos
   * @param {Object} data - Datos a sanitizar
   * @returns {Object} Datos limpios
   */
  sanitize: (data) => {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    
    Object.entries(data).forEach(([key, value]) => {
      // Remover undefined
      if (value === undefined) return;
      
      // Convertir null a null explícito (Firebase lo acepta)
      if (value === null) {
        sanitized[key] = null;
        return;
      }
      
      // Sanitizar strings: trim y evitar strings vacíos
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) sanitized[key] = trimmed;
        return;
      }
      
      // Sanitizar números: evitar NaN
      if (typeof value === 'number' && !isNaN(value)) {
        sanitized[key] = value;
        return;
      }
      
      // Recursivo para objetos anidados
      if (typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = FirebaseUtils.sanitize(value);
        return;
      }
      
      // Arrays: sanitizar cada elemento
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? FirebaseUtils.sanitize(item) 
            : item
        ).filter(item => item !== undefined);
      }
      
      // Default: guardar el valor
      sanitized[key] = value;
    });
    
    return sanitized;
  }

  
};

