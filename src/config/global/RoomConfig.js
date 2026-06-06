/**
 * Room configuration shared by client and server.
 * Must remain free of Vite-specific syntax (no `import.meta.env`) so the
 * Node server can import it directly.
 */

export const MAX_PLAYERS_PER_ROOM = 4;
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
