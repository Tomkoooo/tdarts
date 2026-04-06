// Lightweight superjson stub for Jest (CommonJS environment).
// The real superjson is ESM-only; tRPC only needs serialize/deserialize in tests.

const superjson = {
  serialize: (value: unknown) => ({ json: value, meta: undefined }),
  deserialize: (payload: { json: unknown }) => payload.json,
  stringify: (value: unknown) => JSON.stringify(value),
  parse: (str: string) => JSON.parse(str),
};

export default superjson;
