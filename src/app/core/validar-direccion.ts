import { ciudadesDe, hayCiudadesFijas } from "./ubicaciones";
import { validarNombrePersona, validarOpcion, validarTelefono, validarTexto } from "./validaciones";

export type DireccionValidable = { alias: string; recibe: string; telefono: string; direccion: string; distrito: string; provincia?: string | undefined };
export type PaisDireccion = { codigo: string; telefonoPrefijo: string; telefonoDigitos: number };

/**
 * Valida una dirección de envío. Provincia y ciudad son listas fijas: la ciudad debe ser de la provincia elegida
 * (en países sin lista cargada la ciudad se escribe y se valida como texto).
 */
export function erroresDireccion(d: DireccionValidable, pais: PaisDireccion, provinciasConEnvio: string[]): Record<string, string> {
  const e: Record<string, string> = {};
  const poner = (k: string, m: string) => { if (m) e[k] = m; };
  poner("alias", validarTexto(d.alias, "El alias", 30, true, 2));
  poner("recibe", validarNombrePersona(d.recibe, "Quién recibe"));
  poner("telefono", validarTelefono(d.telefono, pais.telefonoDigitos, pais.telefonoPrefijo, true));
  poner("direccion", validarTexto(d.direccion, "La dirección", 150, true, 5));
  poner("provincia", validarOpcion(d.provincia ?? "", "la provincia de entrega", provinciasConEnvio, true));
  if (hayCiudadesFijas(pais.codigo)) {
    if (!d.provincia) e["distrito"] = "Elige primero la provincia.";
    else poner("distrito", validarOpcion(d.distrito, "la ciudad", ciudadesDe(pais.codigo, d.provincia), true));
  } else poner("distrito", validarTexto(d.distrito, "La ciudad", 80, true, 2));
  return e;
}
