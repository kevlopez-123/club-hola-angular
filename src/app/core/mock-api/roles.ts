import { esRolSistema, matrizDe, normalizarMatriz, registrarRoles, resumenMatriz, rolExiste, type MatrizPermisos } from "../permisos";
import { db } from "./db";
import { ApiError } from "./types";

/**
 * Roles del panel. Los cinco del sistema (Administrador, Catálogo, Operaciones, Atención y Solo lectura) están fijos; el administrador
 * puede crear otros con la combinación de permisos que necesite, duplicarlos y eliminarlos mientras nadie los use.
 * Un backend real guarda los roles y comprueba los permisos en cada petición; esto es lo mismo, simulado.
 */
const roles = () => db.admin.roles as any[];
const usuarios = () => db.admin.usuarios as any[];

/** Mantiene el registro de permisos al día con lo guardado (también tras abrir otra pestaña que cambió los roles). */
export const registrarDesdeDb = () => registrarRoles(roles().map((r) => ({ rol: r.rol, matriz: r.matriz })));
registrarDesdeDb();

export function listarRoles() {
  registrarDesdeDb();
  return roles().map((r) => {
    const matriz = matrizDe(r.rol);
    return {
      rol: r.rol, descripcion: r.descripcion, sistema: esRolSistema(r.rol), matriz, permisos: r.rol === "Administrador" ? ["Todo"] : resumenMatriz(matriz),
      usuarios: usuarios().filter((u) => u.rol === r.rol).length, creado: r.creado, creadoPor: r.creadoPor,
    };
  });
}

function validarNombre(nombre: unknown): string {
  const n = String(nombre ?? "").trim().replace(/\s+/g, " ");
  if (n.length < 3) throw new ApiError(422, "Escribe un nombre de al menos 3 caracteres.");
  if (n.length > 40) throw new ApiError(422, "El nombre no puede pasar de 40 caracteres.");
  if (!/^[\p{L}\p{N} _-]+$/u.test(n)) throw new ApiError(422, "El nombre solo puede llevar letras, números, espacios, guiones y guion bajo.");
  if (roles().some((r) => String(r.rol).toLowerCase() === n.toLowerCase())) throw new ApiError(409, "Ya existe un rol con ese nombre.");
  return n;
}
function validarMatriz(body: any): MatrizPermisos {
  const m = normalizarMatriz(body?.matriz);
  if (!Object.keys(m).length) throw new ApiError(422, "Elige al menos un permiso: un rol sin permisos no puede entrar a ninguna sección.");
  return m;
}
const descripcionDe = (d: unknown) => String(d ?? "").trim().slice(0, 200);

export function crearRol(body: any, por: string) {
  const rol = validarNombre(body?.rol);
  const matriz = validarMatriz(body);
  roles().push({
    rol, descripcion: descripcionDe(body?.descripcion) || `Rol personalizado con acceso a ${resumenMatriz(matriz).length} secciones.`,
    permisos: resumenMatriz(matriz), matriz, creado: new Date().toISOString(), creadoPor: por,
  });
  return listarRoles();
}

export function editarRol(rol: string, body: any) {
  const r = roles().find((x) => x.rol === rol);
  if (!r) throw new ApiError(404, "Ese rol no existe.");
  if (esRolSistema(rol)) throw new ApiError(403, "Los roles del sistema no se pueden modificar. Duplícalo para crear uno propio.");
  const matriz = validarMatriz(body);
  r.matriz = matriz;
  r.permisos = resumenMatriz(matriz);
  if (body?.descripcion !== undefined) r.descripcion = descripcionDe(body.descripcion);
  return listarRoles();
}

export function eliminarRol(rol: string) {
  const r = roles().find((x) => x.rol === rol);
  if (!r) throw new ApiError(404, "Ese rol no existe.");
  if (esRolSistema(rol)) throw new ApiError(403, "Los roles del sistema no se pueden eliminar.");
  const n = usuarios().filter((u) => u.rol === rol).length;
  if (n) throw new ApiError(409, `${n === 1 ? "Hay 1 usuario" : `Hay ${n} usuarios`} con el rol «${rol}»: cámbiales el rol antes de eliminarlo.`);
  db.admin.roles = roles().filter((x) => x.rol !== rol) as any;
  registrarDesdeDb();
  return listarRoles();
}

/** Al guardar usuarios: todos con un rol que exista y al menos un administrador con acceso (si no, nadie podría volver a gestionar el panel). */
export function exigirUsuariosValidos(lista: any[]) {
  registrarDesdeDb();
  for (const u of lista) if (u?.rol && !rolExiste(u.rol)) throw new ApiError(422, `El rol «${u.rol}» no existe.`);
  if (!lista.some((u) => u?.rol === "Administrador" && u.estado !== "Inactivo")) throw new ApiError(422, "Debe quedar al menos un administrador con acceso al panel.");
}
