/**
 * Production WebSocket Server Configuration
 * 
 * After deploying your WebSocket server, update the SERVER_URL below
 * with your actual deployment URL.
 * 
 * You can also set it via environment variable VITE_WEBSOCKET_URL
 * in Netlify or via .env.local file for local development.
 */

// Server deployment URL - Set via VITE_WEBSOCKET_URL environment variable
// Or update directly here if you prefer
export const WEBSOCKET_SERVER_URL = import.meta.env.VITE_WEBSOCKET_URL || '';

// Production domains
export const PRODUCTION_DOMAINS = ['hifeofmools.com', 'www.hifeofmools.com'];

