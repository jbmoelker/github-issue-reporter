// Plasmo polyfills process.env at build time for PLASMO_PUBLIC_* variables.
// Declare it here so TypeScript is satisfied without pulling in all of @types/node.
declare const process: { env: Record<string, string | undefined> }
