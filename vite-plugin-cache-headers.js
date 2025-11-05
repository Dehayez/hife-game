/**
 * Vite plugin to add cache headers for static assets
 * This prevents network requests on reload by telling the browser to use cached files
 */

export function cacheHeadersPlugin() {
  return {
    name: 'cache-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        
        // Add cache headers for static assets
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Content-Type', url.match(/\.png$/i) ? 'image/png' :
                       url.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                       url.match(/\.gif$/i) ? 'image/gif' :
                       url.match(/\.svg$/i) ? 'image/svg+xml' :
                       url.match(/\.webp$/i) ? 'image/webp' :
                       url.match(/\.ico$/i) ? 'image/x-icon' : 'image/png');
        } else if (url.match(/\.(wav|mp3|ogg|m4a)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('Content-Type', url.match(/\.wav$/i) ? 'audio/wav' :
                       url.match(/\.mp3$/i) ? 'audio/mpeg' :
                       url.match(/\.ogg$/i) ? 'audio/ogg' :
                       url.match(/\.m4a$/i) ? 'audio/mp4' : 'audio/wav');
        } else if (url.match(/\.json$/i) && url.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for JSON metadata
          res.setHeader('Content-Type', 'application/json');
        }
        
        next();
      });
    },
  };
}

