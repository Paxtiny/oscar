/**
 * Manual mock for @nicodaimus/crypto used in Jest tests.
 * The real module is ESM-only and Jest can't parse it in CJS mode.
 */
export const createVault = jest.fn();
export const unlockVault = jest.fn();
export const deriveKey = jest.fn();
export const generateSalt = jest.fn();
export const toBase64 = jest.fn((v: unknown) => String(v));
export const fromBase64 = jest.fn((v: string) => v);
export const toBytes = jest.fn((v: unknown) => v);
export const fromBytes = jest.fn((v: unknown) => v);
export const DEFAULT_ARGON2_PARAMS = {};
