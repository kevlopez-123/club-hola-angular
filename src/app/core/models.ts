// Tipos del dominio. Solo tipos: la "base de datos" vive en core/mock-api/seed.
export type {
  Slide,
  Beneficio,
  Direccion,
  NavItem,
} from "./mock-api/seed/mock";
export type { Nivel, NivelId } from "./mock-api/seed/niveles";
export type {
  EstadoBeneficio,
  BeneficioUsuario,
  Compra,
  CompraItem,
  EstadoCompra,
} from "./mock-api/seed/historial";
export type { TarjetaBanbif } from "./mock-api/seed/juegos";
export type {
  Participante,
  EstadoPedido,
  Mensaje,
  RolAdmin,
  TipoCampo,
  CampoForm,
} from "./mock-api/seed/admin";

export type MenuItem = { id?: string; label: string; to?: string; activo: boolean; children?: { label: string; to: string; activo: boolean }[] };
export type SeccionHome = { id: string; s: string; on: boolean };
export type ContenidoSeccion = { t: string; p: string[] };
export type ContenidoFaq = { q: string; a: string };

export type CartItem = {
  id: string;
  tipo: "beneficio";
  nombre: string;
  marca: string;
  imagen: string;
  precio: number;
  cantidad: number;
  digital: true;
};

export type Cupon = { codigo: string; expira: number };

/** Aviso dentro del sitio (campanita). */
export type Notificacion = {
  id: string;
  tipo: "pedido" | "beneficio" | "cuenta" | "info";
  titulo: string;
  texto: string;
  enlace?: string;
  /** ISO con hora. */
  fecha: string;
  leida: boolean;
};

export type Orden = {
  codigo: string;
  items: CartItem[];
  montoUSD: number;
  entrega: string;
  fecha: string;
  /** Hora de la compra (HH:MM). */
  hora?: string;
};

export type Usuario = {
  nombre: string;
  nivel: string;
};

export type Perfil = {
  tipoDocumento: string;
  codigoParticipante: string;
  correo: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  /** Respuestas a los campos que el admin agrega al formulario de datos. */
  extra?: Record<string, string | boolean>;
};

export type Categoria = {
  slug: string;
  label: string;
  icon: string;
  /** SVG propio (data URL) que reemplaza al ícono. */
  imagen?: string;
  subcategorias?: { slug: string; label: string }[];
};
