const STATIC_CACHE    = 'static-v1';
const DYNAMIC_CACHE   = 'dynamic-v1';
const INMUTABLE_CACHE = 'inmutable-v1';

self.addEventListener('install', evento=>{

    const promesa =caches.open(STATIC_CACHE)
        .then(cache=>{
            return cache.addAll([
               // '/',
                'index.html',
                'css/londinium-theme.css',
                'css/styles.css',
                'css/icons.css',
                'js/bootstrap.min.js',
                'js/application.js',
                'offline.html'
            ]);
        });
        //Separamos los archivos que no se modificarán en un espacio de cache inmutable
        const cacheInmutable =  caches.open(INMUTABLE_CACHE)
            .then(cache=>{
                cache.add('https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css');
            });
    
            //Indicamos que la instalación espere hasta que las promesas se cumplan 
        evento.waitUntil(Promise.all([promesa, cacheInmutable]));
});

self.addEventListener('activate', evento => {
    // antes de activar el sw, obten los nombres de los espacios de caché existentes
    const respuesta = caches.keys().then(keys =>{
        //verificar cada nombre de espacios de caché
        keys.forEach(key=>{
            //si el espacio no tiene el nombre actual del caché e incluye la palabra cache
            if(key !== STATIC_CACHE && key.includes('cache')){
                //borrarlo, la condición de include de cache evitará borrar el espacio dinámico o inmutable
                return caches.delete(key);
            }
        });
    });
    evento.waitUntil(respuesta)
 });

self.addEventListener('fetch', evento =>{

    //Estrategia 2 CACHE WITH NETWORK FALLBACK
    const respuesta=caches.match(evento.request)
        .then(res=>{
            //si el archivo existe en cache retornalo
            if (res) return res;

            //si no existe deberá ir a la web
            //Imprimos en consola para saber que no se encontro en cache
            console.log('No existe', evento.request.url);
        
            //Procesamos la respuesta a la petición localizada en la web
            return fetch(evento.request)
                .then(resWeb=>{//el archivo recuperado se almacena en resWeb
                    //se abre nuestro cache
                    caches.open(DYNAMIC_CACHE)
                        .then(cache=>{
                            //se sube el archivo descargado de la web
                            cache.put(evento.request,resWeb);
                            //Mandamos llamar la limpieza al cargar un nuevo archivo
                            //estamos indicando que se limpiará el cache dinamico y que 
                            //solo debe haber 2 archivos
                            limpiarCache(DYNAMIC_CACHE,50);
                        })
                    //se retorna el archivo recuperado para visualizar la página
                    return resWeb.clone();  
                });
        }).catch(err =>{
            //si ocurre un error, en nuestro caso no hay conexiones
            if(evento.request.headers.get('accept').includes('text/html')){
                //si lo que se pide es un archivo html muestra nuestra página offline que está en caché
                return caches.match('/pages/offline.html');
            }
        })
        evento.respondWith(respuesta);     
})


//recibimos el nombre del espacio de cache a limpiar y el número de archivos permitido
function limpiarCache(nombreCache, numeroItems){
    //abrimos el cache
    caches.open(nombreCache)
        .then(cache=>{
            //recuperamos el arreglo de archivos existentes en el espacio de cache
            return cache.keys()
                .then(keys=>{
                    //si el número de archivos supera el limite permitido
                    if (keys.length>numeroItems){
                        //eliminamos el más antiguo y repetimos el proceso
                        cache.delete(keys[0])
                            .then(limpiarCache(nombreCache, numeroItems));
                    }
                });
        });
}
