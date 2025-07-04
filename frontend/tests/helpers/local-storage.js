/**
 * Very small in-memory localStorage polyfill for Node test envs.
 * (Enough for the specs that just call getItem / setItem / removeItem / clear.)
 */

require('ts-node').register({
    transpileOnly : true,        // fast, no type-checking
    skipProject   : true,        // ⬅️  IGNORE tsconfig.json (avoids "bundler" clash)
    compilerOptions: {
      module: 'CommonJS',        // make TS modules require-able
        target: 'es2018',
      },
});

/* ------------------------------------------------------------------ */
/*  localStorage shim (unchanged below)                               */
/* ------------------------------------------------------------------ */
global.localStorage = (() => {
  const store = new Map();
  return {
    getItem   : (k) => (store.has(k) ? store.get(k) : null),
    setItem   : (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear     : () => store.clear(),
  };
})();
