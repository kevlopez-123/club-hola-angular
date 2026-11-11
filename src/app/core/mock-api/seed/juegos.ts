/* ---------------- Tarjetas y documentos (compra de puntos) ---------------- */

export const tiposDocumento = ["DNI", "Carné de Extranjería", "Pasaporte"];

export type TarjetaBanbif = { id: string; label: string };

export const tarjetasBanbif: TarjetaBanbif[] = [
  { id: "visa-266", label: "VISA - 6557-32XX-XXXX-X266" },
  { id: "mc-2210", label: "MASTERCARD - 5412-88XX-XXXX-X210" },
  { id: "visa-8821", label: "VISA SIGNATURE - 4532-19XX-XXXX-X821" },
  { id: "amex-3390", label: "AMEX - 3782-82XX-XXXX-X390" },
];

/* ---------------- Contacto ---------------- */

export const contacto = {
  horario: "Horarios atención: Lun-Vie de 9h a 18h",
  telefonos: "123 456 / 969 317 582",
  correo: "servicio.cliente@dominio.com",
};

/* ---------------- Spin & Win y Lucky Code ---------------- */

import type { CodigoPromo, Premio } from "../../juegos";

export const GIROS_POR_SEMANA = 3;

export const premiosIniciales: Premio[] = [
  { id: "r2", label: "Gift Card S/ 50", tipo: "giftcard", detalle: "Gift card virtual de S/ 50 para usar en tiendas asociadas.", enRuleta: true, activo: true },
  { id: "r3", label: "Sigue intentando", tipo: "nada", detalle: "Esta vez no hubo suerte, ¡vuelve a girar!", enRuleta: true, activo: true },
  { id: "r4", label: "Cupón de hamburguesa", tipo: "cupon", detalle: "Cupón digital por un combo clásico para usar en locales participantes.", enRuleta: true, activo: true },
  { id: "r5", label: "Vale digital S/ 100", tipo: "vale", detalle: "Vale digital de S/ 100 para usar en comercios asociados.", enRuleta: true, activo: true },
  { id: "r6", label: "Invitación al cine", tipo: "invitacion", detalle: "Invitación digital para dos personas a una función privada de cine.", enRuleta: true, activo: true },
  { id: "r7", label: "Sigue intentando", tipo: "nada", detalle: "Esta vez no hubo suerte, ¡vuelve a girar!", enRuleta: true, activo: true },
  { id: "r9", label: "Sigue intentando", tipo: "nada", detalle: "Esta vez no hubo suerte, ¡vuelve a girar!", enRuleta: true, activo: true },
  { id: "r10", label: "Cupón café 2x1", tipo: "cupon", detalle: "Cupón digital 2x1 en bebidas en cafeterías participantes.", enRuleta: true, activo: true },
  { id: "lc1", label: "Gift Card S/ 15", tipo: "giftcard", detalle: "¡Acabas de ganar una gift card de S/ 15!", enRuleta: false, activo: true },
  { id: "lc3", label: "Vale digital S/ 100", tipo: "vale", detalle: "¡Ganaste un vale digital de S/ 100 para usar en comercios asociados!", enRuleta: false, activo: true },
];

export const codigosIniciales: CodigoPromo[] = [
  { codigo: "76BC-H49A-547F-WBB2", premioId: "lc1", premio: "Gift Card S/ 15", usado: false },
  { codigo: "AAAA-BBBB-CCCC-DDDD", premioId: "lc3", premio: "Vale digital S/ 100", usado: false },
  { codigo: "K3MP-92QX-T7LD-0NVA", premioId: "lc1", premio: "Gift Card S/ 15", usado: true, usadoPor: "Luis Mendoza", fechaUso: "02/11/2026" },
];
