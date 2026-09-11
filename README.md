# Marcador de cartas

Aplicación web mobile first para llevar las puntuaciones de partidas familiares. Incluye Pinacle para 2 o 3 participantes, Escoba para 2 jugadores y Brisca para 2, 3 o 4 jugadores.

No usa backend ni dependencias en tiempo de ejecución. Las partidas y los participantes frecuentes se guardan en `localStorage` y las rondas son la única fuente de verdad para todos los cálculos.

## Desarrollo

Requisitos: Node.js 18 o posterior y npm.

```bash
npm install
npm run build
npm run serve
```

Abre `http://localhost:4173`. El servidor local usa únicamente módulos nativos de Node.

Para recompilar Tailwind automáticamente mientras editas:

```bash
npm run dev
```

En otra terminal, mantén `npm run serve` en ejecución.

Para simular localmente una URL de proyecto de GitHub Pages, inicia el servidor con una ruta base. En PowerShell:

```powershell
$env:BASE_PATH = "/puntuacion-cartas/"
npm run serve
```

La aplicación estará disponible en `http://localhost:4173/puntuacion-cartas/`.

## Pruebas

```bash
npm test
```

## PWA y modo offline

La PWA debe probarse desde `http://localhost:4173` (o desde un hosting HTTPS), no abriendo `index.html` directamente. Carga la aplicación una vez, espera a que el Service Worker quede activo y recarga. Después activa el modo sin conexión en las herramientas del navegador y vuelve a recargar.

Cuando el navegador expone la instalación, la pantalla principal muestra **Instalar aplicación**. En otros navegadores se puede usar la opción de instalación de la barra de direcciones o del menú.

Al cambiar cualquier archivo precacheado, incrementa la versión de `CACHE_NAME` en `service-worker.js` para publicar una nueva caché. La renovación de caché no modifica `localStorage` ni las cachés de otras aplicaciones alojadas en el mismo dominio.

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` se ejecuta con cada push a `main`. Instala las dependencias con `npm ci`, compila Tailwind y prepara en `site/` únicamente los archivos necesarios en producción antes de desplegarlos.

En GitHub, abre **Settings → Pages** y selecciona **GitHub Actions** como origen en **Build and deployment → Source**. No hay que seleccionar una rama ni una carpeta de publicación.

Todas las rutas públicas son relativas. El manifest, el registro del Service Worker, su ámbito y sus recursos precacheados funcionan tanto en la raíz como en una URL de proyecto del tipo `https://USUARIO.github.io/NOMBRE-REPO/`.
