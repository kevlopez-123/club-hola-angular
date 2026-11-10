// Genera docs/api/openapi.yaml a partir de las rutas de la MockAPI (src/app/core/mock-api/*.ts).
// La MockAPI es hoy la especificación ejecutable del backend: este script la vuelca a OpenAPI 3.0 para
// que backend y app móvil trabajen contra el mismo contrato.  Uso: npm run api:docs
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CONTRATOS, generarEsquemas } from "./esquemas-openapi.mjs";

const { esquemas } = generarEsquemas();
const ref = (n) => (n.endsWith("[]") ? `{ type: array, items: { $ref: "#/components/schemas/${n.slice(0, -2)}" } }` : `{ $ref: "#/components/schemas/${n}" }`);

const dir = "src/app/core/mock-api";
const archivos = readdirSync(dir).filter((f) => f.endsWith(".ts"));
const coleccionesTxt = readFileSync(join(dir, "admin-routes.ts"), "utf8").match(/const LISTAS = \[([\s\S]*?)\] as const/)?.[1] ?? "";
const colecciones = [...coleccionesTxt.matchAll(/"(\w+)"/g)].map((m) => m[1]);

const rutas = [];
for (const f of archivos) {
  const lineas = readFileSync(join(dir, f), "utf8").split(/\r?\n/);
  lineas.forEach((l, i) => {
    const m = l.match(/^\s*\["(GET|POST|PUT|PATCH|DELETE)",\s*["`]([^"`]+)["`]/);
    if (!m) return;
    let doc = "";
    for (let j = i - 1; j >= 0 && j >= i - 4; j--) {
      const d = lineas[j].match(/^\s*\/\*\*\s*(.*?)\s*\*\/\s*$/) ?? lineas[j].match(/^\s*\/\/\s*(.*)$/);
      if (d) { doc = d[1]; break; }
      if (lineas[j].trim() && !lineas[j].trim().startsWith("*")) break;
    }
    rutas.push({ metodo: m[1].toLowerCase(), ruta: m[2], doc, archivo: f });
  });
}

const tag = (r) => {
  const p = r.ruta.split("/");
  if (p[0] === "admin") return `admin-${p[1]?.replace(/:.*/, "") || "general"}`.replace(/^admin-(c|q)$/, "admin-colecciones");
  if (p[0] === "me") return "participante";
  return p[0];
};
const paramsDe = (ruta) => [...ruta.matchAll(/:(\w+)/g)].map((m) => m[1]);
const aOpenApi = (ruta) => "/" + ruta.replace(/:(\w+)/g, "{$1}");
const y = (s) => JSON.stringify(s);

const porRuta = new Map();
for (const r of rutas) {
  const k = aOpenApi(r.ruta);
  if (!porRuta.has(k)) porRuta.set(k, []);
  porRuta.get(k).push(r);
}

let out = `openapi: 3.0.3
info:
  title: Banco Solidario Puntos API
  version: 0.1.0
  description: |
    Contrato del API que consumen el sitio del participante, el panel de administración y la app móvil.
    GENERADO desde la MockAPI (\`npm run api:docs\`): no editar a mano. Los cuerpos y respuestas de cada
    endpoint están en src/app/core/models.ts y en los handlers de src/app/core/mock-api/.
    Convenciones: JSON, errores \`{ "message": string }\` con el código HTTP (401 sin sesión, 403 sin permiso, 409 conflicto, 422 validación).
servers:
  - url: /api
    description: Misma ruta base que \`environment.apiBase\`
components:
  securitySchemes:
    bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    Error:
      type: object
      required: [message]
      properties:
        message: { type: string }
    __ESQUEMAS__
    Paginado:
      type: object
      description: Respuesta de las listas paginadas del panel (admin/q/{col}).
      properties:
        items: { type: array, items: { type: object } }
        total: { type: integer }
        page: { type: integer }
        size: { type: integer }
        facetas: { type: object, additionalProperties: { type: object, additionalProperties: { type: integer } } }
  responses:
    Error:
      description: Error
      content:
        application/json:
          schema: { $ref: "#/components/schemas/Error" }
paths:
`;
for (const [ruta, ops] of porRuta) {
  out += `  ${y(ruta)}:\n`;
  for (const o of ops) {
    const ps = paramsDe(o.ruta);
    const publico = o.ruta.startsWith("auth/") || (!o.ruta.startsWith("admin/") && !o.ruta.startsWith("me/") && o.metodo === "get") || o.ruta === "contacto";
    out += `    ${o.metodo}:\n`;
    out += `      tags: [${y(tag(o))}]\n`;
    out += `      summary: ${y(o.doc || `${o.metodo.toUpperCase()} ${o.ruta}`)}\n`;
    out += `      operationId: ${y(o.metodo + "_" + o.ruta.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, ""))}\n`;
    if (!publico) out += `      security: [{ bearer: [] }]\n`;
    const todos = [...ps.map((p) => ({ n: p, en: "path" }))];
    if (o.ruta === "admin/q/:col") for (const q of ["page", "size", "q", "sort", "dir", "desde", "hasta", "facetas"]) todos.push({ n: q, en: "query" });
    if (todos.length) {
      out += `      parameters:\n`;
      for (const p of todos) {
        const enumCol = p.n === "col" && o.ruta.startsWith("admin/") ? `, enum: [${colecciones.map(y).join(", ")}]` : "";
        out += `        - { name: ${y(p.n)}, in: ${p.en}, required: ${p.en === "path"}, schema: { type: ${["page", "size"].includes(p.n) ? "integer" : "string"}${enumCol} } }\n`;
      }
    }
    const contrato = CONTRATOS[`${o.metodo.toUpperCase()} ${o.ruta}`] ?? {};
    if (["post", "put", "patch"].includes(o.metodo)) out += `      requestBody:\n        content:\n          application/json:\n            schema: ${contrato.req ? ref(contrato.req) : "{ type: object }"}\n`;
    out += `      responses:\n        "200":\n          description: OK\n          content:\n            application/json:\n              schema: ${o.ruta === "admin/q/:col" ? '{ $ref: "#/components/schemas/Paginado" }' : contrato.res ? (contrato.mapa ? `{ type: object, additionalProperties: ${ref(contrato.res)} }` : ref(contrato.res)) : "{ type: object }"}\n`;
    out += `        "4XX": { $ref: "#/components/responses/Error" }\n`;
  }
}
const bloque = Object.entries(esquemas).map(([n, e]) => `    ${n}: ${JSON.stringify(e)}`).join("\n");
out = out.replace("    __ESQUEMAS__", bloque);
mkdirSync("docs/api", { recursive: true });
writeFileSync("docs/api/openapi.yaml", out);
console.log(`OpenAPI: ${rutas.length} operaciones en ${porRuta.size} rutas -> docs/api/openapi.yaml`);