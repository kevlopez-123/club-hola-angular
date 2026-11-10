/** Contexto que recibe cada handler del backend simulado. */
export type Ctx = { body: any; params: Record<string, string>; query: URLSearchParams };
export type Handler = (ctx: Ctx) => unknown;
export type Route = [method: string, path: string, handler: Handler];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
