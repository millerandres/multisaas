// Service Worker Multi-Negocio - Versión Corregida
const CACHE_VERSION = 'v6-multinegocio';
const CACHE_NAME = `app-pedidos-${CACHE_VERSION}`;

const urlsToCache = [
  '/',
  '/app.html',
  '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker instalándose...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Archivos base cacheados');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('⚠️ Error cacheando:', err))
  );
  self.skipWaiting();
});

// Activar Service Worker - LIMPIAR CACHE ANTIGUO
self.addEventListener('activate', event => {
  console.log('🔧 Service Worker activándose...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Eliminar caches antiguos que no sean el actual
          if (cacheName !== CACHE_NAME && cacheName.startsWith('app-pedidos-')) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activado y cache limpio');
      return self.clients.claim();
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Intercepta el manifest.json para hacerlo dinámico
  if (event.request.url.includes('manifest.json') && requestUrl.searchParams.has('negocio')) {
    event.respondWith(handleManifestRequest(event.request));
    return;
  }

  // Para otras peticiones - Cache First, luego Network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Devolver desde cache y actualizar en background
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse);
              });
            }
          });
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/app.html');
        }
      })
  );
});

// Manejar petición de manifest dinámico
async function handleManifestRequest(request) {
  try {
    const url = new URL(request.url);
    const negocioParam = url.searchParams.get('negocio');
    
    if (!negocioParam) {
      return caches.match('/manifest.json');
    }

    // Crear cache key único para este negocio
    const manifestCacheKey = `/manifest-${negocioParam}.json`;
    
    // Verificar si tenemos datos cacheados del negocio
    let cachedManifest = await caches.match(manifestCacheKey);
    if (cachedManifest) {
      console.log('✅ Manifest cacheado para:', negocioParam);
      return cachedManifest;
    }

    // Si no, buscar en Firebase
    const response = await fetch(`https://multinegocio-default-rtdb.firebaseio.com/negocios.json`);
    const negocios = await response.json();
    
    let negocioEncontrado = null;
    let negocioId = null;

    Object.entries(negocios).forEach(([id, negocio]) => {
      const slug = negocio.slug || nombreASlug(negocio.nombre);
      if (slug === negocioParam || id === negocioParam) {
        negocioEncontrado = negocio;
        negocioId = id;
      }
    });

    if (!negocioEncontrado) {
      return caches.match('/manifest.json');
    }

    // Crear manifest dinámico ÚNICO por negocio
    const dynamicManifest = {
      name: `${negocioEncontrado.nombre} - Pedidos`,
      short_name: negocioEncontrado.nombre.substring(0, 12),
      description: `App de pedidos - ${negocioEncontrado.nombre}`,
      start_url: `/app.html?negocio=${negocioParam}`,
      display: 'standalone',
      background_color: '#FFF5F0',
      theme_color: negocioEncontrado.colores?.primario || '#FF6B9D',
      orientation: 'portrait',
      scope: `/app.html?negocio=${negocioParam}`,
      id: `/app.html?negocio=${negocioParam}`, // ✅ ID único por negocio
      icons: [
        {
          src: negocioEncontrado.logo || '/images/logo-default-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: negocioEncontrado.logo || '/images/logo-default-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };

    // Cache del manifest específico del negocio
    const cache = await caches.open(CACHE_NAME);
    const manifestResponse = new Response(JSON.stringify(dynamicManifest), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
    cache.put(manifestCacheKey, manifestResponse.clone());
    console.log('✅ Manifest generado y cacheado para:', negocioEncontrado.nombre);

    return manifestResponse;

  } catch (error) {
    console.error('❌ Error generando manifest dinámico:', error);
    return caches.match('/manifest.json');
  }
}

function nombreASlug(nombre) {
  if (!nombre || typeof nombre !== 'string') {
    return 'negocio-invalido-' + Date.now();
  }
  return nombre.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}