// Tipos del dominio. Solo tipos: la "base de datos" vive en core/mock-api/seed.
import type { Producto as ProductoSeed } from "./mock-api/seed/mock";
export type {
  Slide,
  Subcategoria,
  CategoriaProducto,
  Beneficio,
  Direccion,
  NavItem,
} from "./mock-api/seed/mock";
export type { Nivel, NivelId } from "./mock-api/seed/niveles";
export type { Ciudad, Destino, Cotizacion, PasajeroCotizacion, MensajeCotizacion, EstadoCotizacion } from "./mock-api/seed/vuelos";
export type {
  EstadoBeneficio,
  BeneficioUsuario,
  Compra,
  CompraItem,
  TipoMovimiento,
  Movimiento,
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

/** Producto del catálogo; `destacado` lo administra el panel. No hay control de inventario: un producto activo siempre se puede canjear. */
export type Producto = ProductoSeed & { destacado?: boolean };

export type MenuItem = { id?: string; label: string; to?: string; activo: boolean; children?: { label: string; to: string; activo: boolean }[] };
export type SeccionHome = { id: string; s: string; on: boolean };
export type Reglas = { porDolar: number; precio: number; min: number; max: number; mensual: number; paquetes: number[]; compraActiva: boolean; soloDinero: boolean; vigenciaMeses?: number; avisoVencimientoDias?: number; version?: number };
export type ContenidoSeccion = { t: string; p: string[] };
export type ContenidoFaq = { q: string; a: string };

export type CartItem = {
  id: string;
  tipo: "producto" | "beneficio";
  nombre: string;
  marca: string;
  imagen: string;
  puntos: number;
  precio: number;
  cantidad: number;
  digital: boolean;
  soloDinero?: boolean;
};

export type Cupon = { codigo: string; expira: number };

/** Aviso dentro del sitio (campanita). */
export type Notificacion = {
  id: string;
  tipo: "pedido" | "puntos" | "beneficio" | "vuelo" | "cuenta" | "info";
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
  puntosUsados: number;
  montoUSD: number;
  entrega: string;
  fecha: string;
  /** Hora de la compra (HH:MM). */
  hora?: string;
};

export type Usuario = {
  nombre: string;
  nivel: string;
  puntosNivel: number;
  puntos: number;
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

export type Orden_Producto = "recomendado" | "puntos-asc" | "puntos-desc" | "az";
