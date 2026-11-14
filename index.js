/**
 * Root entry, kept as a re-export of the real Host half.
 *
 * DSH's loader resolves a bundle by importing its package root directly rather
 * than through the `exports` map, so a package whose entry lives only at
 * `./lib/index.js` fails with ERR_MODULE_NOT_FOUND ("Cannot find module
 * .../index.js") — and a missing Host half silently costs the whole bundle its
 * loopback routes and sidebar entry. This file keeps the root resolvable
 * whatever the loader prefers.
 */
export { name, inject, apply } from './lib/index.js';
