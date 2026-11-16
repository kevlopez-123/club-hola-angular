const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Departamento con el que abre el mapa de una persona con sesión, sin pedir su ubicación: el de su perfil y, si ese no tiene
 * establecimientos, el de sus direcciones guardadas. Solo cuenta si hay establecimientos allí; si no, devuelve "" (todo el país).
 * Devuelve el nombre tal como figura en `disponibles`.
 */
export function regionInicial(departamentoPerfil: string | undefined, direcciones: readonly { provincia?: string | undefined }[], disponibles: readonly string[]): string {
  const candidatos = [departamentoPerfil, ...direcciones.map((d) => d.provincia)].filter((x): x is string => !!x?.trim());
  for (const c of candidatos) {
    const hallado = disponibles.find((d) => sinTildes(d) === sinTildes(c));
    if (hallado) return hallado;
  }
  return "";
}
