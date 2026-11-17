const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Departamento con el que abre el mapa de una persona con sesión, sin pedir su ubicación: el de su perfil.
 * Solo cuenta si hay establecimientos allí; si no, devuelve "" (todo el país). Devuelve el nombre tal como figura en `disponibles`.
 */
export function regionInicial(departamentoPerfil: string | undefined, disponibles: readonly string[]): string {
  if (!departamentoPerfil?.trim()) return "";
  return disponibles.find((d) => sinTildes(d) === sinTildes(departamentoPerfil)) ?? "";
}
