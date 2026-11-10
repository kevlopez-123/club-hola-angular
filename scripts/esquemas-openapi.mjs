// Convierte los tipos exportados de src/app/core/models.ts a esquemas JSON (OpenAPI components.schemas)
// con el compilador de TypeScript, y define qué esquema usa cada endpoint del participante.
import ts from "typescript";

export function generarEsquemas() {
  const cfg = ts.readConfigFile("tsconfig.app.json", ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, ".");
  const program = ts.createProgram(["src/app/core/models.ts"], parsed.options);
  const checker = program.getTypeChecker();
  const fuente = program.getSourceFile("src/app/core/models.ts");
  const modulo = checker.getSymbolAtLocation(fuente);
  const exportados = checker.getExportsOfModule(modulo);
  const nombres = new Set(exportados.map((s) => s.getName()));
  const esquemas = {};

  const aEsquema = (t, profundidad = 0) => {
    const f = t.flags;
    if (f & ts.TypeFlags.String) return { type: "string" };
    if (f & ts.TypeFlags.Number) return { type: "number" };
    if (f & ts.TypeFlags.Boolean || f & ts.TypeFlags.BooleanLiteral) return { type: "boolean" };
    if (f & ts.TypeFlags.StringLiteral) return { type: "string", enum: [t.value] };
    if (f & ts.TypeFlags.NumberLiteral) return { type: "number", enum: [t.value] };
    if (f & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) return { nullable: true };
    if (f & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return {};
    if (t.isUnion()) {
      const partes = t.types.filter((x) => !(x.flags & ts.TypeFlags.Undefined));
      if (partes.every((x) => x.flags & (ts.TypeFlags.StringLiteral))) return { type: "string", enum: partes.map((x) => x.value) };
      if (partes.every((x) => x.flags & ts.TypeFlags.BooleanLiteral)) return { type: "boolean" };
      const distintas = partes.map((x) => aEsquema(x, profundidad + 1));
      return distintas.length === 1 ? distintas[0] : { oneOf: distintas };
    }
    if (checker.isArrayType(t)) return { type: "array", items: aEsquema(checker.getTypeArguments(t)[0], profundidad + 1) };
    if (checker.isTupleType?.(t)) return { type: "array", items: {} };
    const idx = t.getStringIndexType?.();
    const props = checker.getPropertiesOfType(t);
    if (idx && !props.length) return { type: "object", additionalProperties: aEsquema(idx, profundidad + 1) };
    if (profundidad > 6) return { type: "object" };
    const properties = {};
    const required = [];
    for (const p of props) {
      const pt = checker.getTypeOfSymbolAtLocation(p, fuente);
      properties[p.getName()] = aEsquema(pt, profundidad + 1);
      if (!(p.flags & ts.SymbolFlags.Optional)) required.push(p.getName());
    }
    const out = { type: "object", properties };
    if (required.length) out.required = required;
    return out;
  };

  for (const s of exportados) {
    const nombre = s.getName();
    const decl = checker.getDeclaredTypeOfSymbol(s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);
    if (!decl || /^(Estado|Tipo)/.test(nombre) && false) continue;
    esquemas[nombre] = aEsquema(decl);
  }
  return { esquemas, nombres };
}

/** Esquema de respuesta (res) y de cuerpo (req) por endpoint. `X[]` = lista de X. */
export const CONTRATOS = {
  "GET catalogo/productos": { res: "Producto[]" },
  "GET catalogo/productos/:id": { res: "Producto" },
  "GET catalogo/beneficios": { res: "Beneficio[]" },
  "GET catalogo/beneficios/:id": { res: "Beneficio" },
  "GET catalogo/categorias-producto": { res: "CategoriaProducto[]" },
  "GET catalogo/categorias-beneficio": { res: "Categoria[]" },
  "GET catalogo/banners/:seccion": { res: "Slide[]" },
  "GET niveles": { res: "Nivel[]" },
  "GET vuelos/ciudades": { res: "Ciudad[]" },
  "GET vuelos/destinos": { res: "Destino[]" },
  "GET vuelos/destinos/:slug": { res: "Destino" },
  "GET me": { res: "Usuario" },
  "GET me/perfil": { res: "Perfil" },
  "PUT me/perfil": { req: "Perfil", res: "Perfil" },
  "GET me/direcciones": { res: "Direccion[]" },
  "POST me/direcciones": { req: "Direccion" },
  "PUT me/direcciones/:id": { req: "Direccion" },
  "GET me/cupones": { res: "Cupon", mapa: true },
  "POST me/cupones": { res: "Cupon" },
  "GET me/movimientos": { res: "Movimiento[]" },
  "GET me/compras": { res: "Compra[]" },
  "GET me/compras/:codigo": { res: "Compra" },
  "GET me/beneficios": { res: "BeneficioUsuario[]" },
  "GET me/cotizaciones": { res: "Cotizacion[]" },
  "POST me/cotizaciones": { req: "Cotizacion", res: "Cotizacion" },
  "PATCH me/cotizaciones/:codigo": { req: "Cotizacion", res: "Cotizacion" },
  "POST ordenes": { req: "Orden", res: "Orden" },
  "GET admin/c/participantes": { res: "Participante[]" },
  "GET admin/c/mensajes": { res: "Mensaje[]" },
};