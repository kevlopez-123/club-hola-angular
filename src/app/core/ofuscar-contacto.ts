/** «ana.torres@dominio.com» → «an*********@dominio.com»: se ven 2 letras del nombre y el dominio. */
export function ofuscarCorreo(correo: string): string {
  const [nombre = "", dominio = ""] = correo.split("@");
  return `${nombre.slice(0, 2)}${"*".repeat(Math.max(3, nombre.length - 2))}@${dominio}`;
}

/** «+51 987 654 321» → «+51 *** *** 321»: se ven el prefijo y los 3 últimos dígitos. */
export function ofuscarTelefono(telefono: string): string {
  const limpio = telefono.replace(/\s/g, "");
  const prefijo = limpio.startsWith("+") ? limpio.slice(0, 3) : "";
  return `${prefijo}${prefijo ? " " : ""}*** *** ${limpio.slice(-3)}`;
}
