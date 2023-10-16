// @ts-check
const { buildSync } = require('esbuild')

/** @type {import('esbuild').BuildOptions} */
const commonOptions = {
    bundle: true,
    logLevel: 'error',
    entryPoints: ['lib-font.mjs'],
    define: { 'import.meta.url': 'undefined' },
    external: ['zlib'],
}

buildSync({
    ...commonOptions,
    format: 'cjs',
    outfile: 'lib-font.js',
})
