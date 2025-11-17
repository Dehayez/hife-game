/**
 * Vite plugin to add cache headers for static assets
 * This prevents network requests on reload by telling the browser to use cached files
 */

export function cacheHeadersPlugin() {
  return {
    name: 'cache-headers',
    configureServer(server) {
      // Insert middleware early in the stack to ensure cache headers are set
      // This runs before Vite's static file middleware
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        // Remove query parameters for matching (Vite may add cache-busting params)
        const urlWithoutQuery = url.split('?')[0];
        
        // Only process assets from /assets/ or root public files
        const isAsset = urlWithoutQuery.startsWith('/assets/') || 
                       urlWithoutQuery.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|wav|mp3|ogg|m4a|json)$/i);
        
        if (isAsset) {
          // Add cache headers for static assets
          if (urlWithoutQuery.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Content-Type', urlWithoutQuery.match(/\.png$/i) ? 'image/png' :
                         urlWithoutQuery.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                         urlWithoutQuery.match(/\.gif$/i) ? 'image/gif' :
                         urlWithoutQuery.match(/\.svg$/i) ? 'image/svg+xml' :
                         urlWithoutQuery.match(/\.webp$/i) ? 'image/webp' :
                         urlWithoutQuery.match(/\.ico$/i) ? 'image/x-icon' : 'image/png');
          } else if (urlWithoutQuery.match(/\.(wav|mp3|ogg|m4a)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Content-Type', urlWithoutQuery.match(/\.wav$/i) ? 'audio/wav' :
                         urlWithoutQuery.match(/\.mp3$/i) ? 'audio/mpeg' :
                         urlWithoutQuery.match(/\.ogg$/i) ? 'audio/ogg' :
                         urlWithoutQuery.match(/\.m4a$/i) ? 'audio/mp4' : 'audio/wav');
          } else if (urlWithoutQuery.match(/\.json$/i) && urlWithoutQuery.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for JSON metadata
            res.setHeader('Content-Type', 'application/json');
          }
        }
        
        next();
      });
    },
  };
}

