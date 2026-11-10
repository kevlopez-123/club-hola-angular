/* ---------------- Tarjetas y documentos (compra de puntos) ---------------- */

export const tiposDocumento = ["Cédula de Identidad", "Carné de Extranjería", "Pasaporte"];

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
