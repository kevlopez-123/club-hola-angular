import { Injectable, computed, inject, signal } from "@angular/core";
import type { Observable } from "rxjs";
import { map, tap } from "rxjs/operators";
import { ToastService } from "../shared/toast";
import { ApiService } from "./api.service";
import { AnaliticaService } from "./analitica.service";
import { SesionService } from "./sesion.service";
import { Router } from "@angular/router";
import { codigoAleatorio, fechaLarga } from "./format";
import type { CartItem, Cupon, Direccion, Orden, Perfil, Usuario, Notificacion } from "./models";

const LS_CART = "bs_carrito";
const LS_FAV = "bs_favoritos";

const leer = <T>(key: string, vacio: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : vacio;
  } catch {
    return vacio;
  }
};
const guardar = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento disponible */
  }
};

/**
 * Estado de la sesión del participante (equivale al StoreProvider de la versión React).
 * El carrito y los favoritos se guardan en el navegador; el resto se persiste vía la API.
 */
@Injectable({ providedIn: "root" })
export class StoreService {
  private readonly api = inject(ApiService);
  private readonly falla = () => undefined; /* el aviso global de red ya informa; la sesión sigue con los datos que tenga */
  private readonly toast = inject(ToastService);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly analitica = inject(AnaliticaService);

  /** Acciones de cuenta (favoritos, cupones…): sin sesión se pide ingresar y se vuelve a la página actual. */
  exigirSesion(): boolean {
    if (this.sesion.logged()) return true;
    this.sesion.irAIngresar(this.router.url);
    return false;
  }

  readonly usuario = signal<Usuario>({ nombre: "", nivel: "Oro" });
  readonly perfil = signal<Perfil | null>(null);
  readonly items = signal<CartItem[]>(leer<CartItem[]>(LS_CART, []));
  readonly favoritos = signal<string[]>(leer<string[]>(LS_FAV, []));
  readonly cupones = signal<Record<string, Cupon>>({});
  readonly direcciones = signal<Direccion[]>([]);
  readonly correos = signal<string[]>([]);
  readonly ultimaOrden = signal<Orden | null>(null);
  /** Avisos dentro del sitio (campanita), del más nuevo al más antiguo. */
  readonly notificaciones = signal<Notificacion[]>([]);
  readonly noLeidas = computed(() => this.notificaciones().filter((n) => !n.leida).length);

  readonly totalItems = computed(() => this.items().reduce((a, i) => a + i.cantidad, 0));
  readonly totalMonto = computed(() => this.items().reduce((a, i) => a + i.precio * i.cantidad, 0));

  /** Carga el estado inicial desde la API (se ejecuta al arrancar la app). */
  init() {
    if (!this.sesion.logged()) return; // visitante: solo catálogo y páginas públicas
    this.api.get<Usuario>("me").subscribe((u) => this.usuario.set(u));
    this.api.get<Perfil>("me/perfil").subscribe({ next: (p) => this.perfil.set(p), error: this.falla });
    this.api.get<Direccion[]>("me/direcciones").subscribe({ next: (d) => this.direcciones.set(d), error: this.falla });
    this.api.get<string[]>("me/correos").subscribe({ next: (c) => this.correos.set(c), error: this.falla });
    this.api.get<Record<string, Cupon>>("me/cupones").subscribe({ next: (c) => this.cupones.set(c), error: this.falla });
    this.cargarNotificaciones();
  }

  /* ---------------- Notificaciones ---------------- */
  /** Cada lectura o cambio invalida las lecturas que seguían en camino (una respuesta vieja no debe pisar lo marcado). */
  private versionNotificaciones = 0;
  cargarNotificaciones() {
    const v = ++this.versionNotificaciones;
    this.api.get<Notificacion[]>("me/notificaciones").subscribe({ next: (n) => v === this.versionNotificaciones && this.notificaciones.set(n), error: this.falla });
  }
  /** Marca como leídas las indicadas o, sin argumento, todas. Se refleja al instante y se confirma con el servidor. */
  marcarLeidas(ids?: string[]) {
    this.notificaciones.update((l) => l.map((n) => (!ids || ids.includes(n.id) ? { ...n, leida: true } : n)));
    this.versionNotificaciones++;
    this.api.post("me/notificaciones/leer", ids ? { ids } : {}).subscribe({ error: this.falla });
  }

  /* ---------------- Carrito ---------------- */
  private setItems(next: CartItem[]) {
    this.items.set(next);
    guardar(LS_CART, next);
  }

  add(item: Omit<CartItem, "cantidad">, cantidad = 1) {
    this.analitica.registrar({ tipo: "agregar_carrito", itemId: item.id, itemTipo: item.tipo });
    const prev = this.items();
    const found = prev.find((i) => i.id === item.id);
    this.setItems(
      found
        ? prev.map((i) => (i.id === item.id ? { ...i, cantidad: i.cantidad + cantidad } : i))
        : [...prev, { ...item, cantidad }],
    );
  }
  setCantidad(id: string, cantidad: number) {
    this.setItems(this.items().map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, cantidad) } : i)));
  }
  remove(id: string) {
    this.setItems(this.items().filter((i) => i.id !== id));
  }
  clear() {
    this.setItems([]);
  }

  /* ---------------- Favoritos y cupones ---------------- */
  toggleFavorito(id: string) {
    if (!this.exigirSesion()) return;
    const prev = this.favoritos();
    const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
    this.favoritos.set(next);
    guardar(LS_FAV, next);
    this.api.post<string[]>(`me/favoritos/${id}`).subscribe();
  }
  esFavorito(id: string) {
    return this.favoritos().includes(id);
  }

  generarCupon(beneficioId: string) {
    if (!this.exigirSesion()) return;
    this.api.post<Cupon>("me/cupones", { beneficioId }).subscribe({
      next: (c) => this.cupones.update((prev) => ({ ...prev, [beneficioId]: c })),
      error: (e) => this.toast.error(this.mensajeError(e)),
    });
  }

  /* ---------------- Direcciones y correos ---------------- */
  addDireccion(d: Omit<Direccion, "id">): string {
    const id = `d${Date.now()}`;
    this.direcciones.update((prev) => [...prev, { ...d, id }]);
    this.api.post("me/direcciones", { ...d, id }).subscribe();
    return id;
  }
  updateDireccion(d: Direccion) {
    this.direcciones.update((prev) => prev.map((x) => (x.id === d.id ? d : x)));
    this.api.put(`me/direcciones/${d.id}`, d).subscribe();
  }
  removeDireccion(id: string) {
    this.direcciones.update((prev) => prev.filter((x) => x.id !== id));
    this.api.delete(`me/direcciones/${id}`).subscribe();
  }
  addCorreo(correo: string) {
    this.correos.update((prev) => (prev.includes(correo) ? prev : [...prev, correo]));
    this.api.post("me/correos", { correo }).subscribe();
  }

  /* ---------------- Compras ---------------- */
  /** Mensaje legible de un error HTTP de la API. */
  mensajeError(e: unknown, defecto = "No pudimos completar la operación. Inténtalo de nuevo.") {
    return (e as { error?: { message?: string } })?.error?.message ?? defecto;
  }

  /** Confirma la compra en la API (valida la cuenta y la tarjeta del banco) y solo entonces actualiza el estado local. */
  finalizarCompra(o: Omit<Orden, "codigo" | "fecha" | "hora"> & { tarjeta: string }): Observable<Orden> {
    return this.api.post<{ codigo: string; fecha: string; hora: string }>("ordenes", o).pipe(
      map((r): Orden => ({ items: o.items, montoUSD: o.montoUSD, entrega: o.entrega, codigo: r.codigo, fecha: r.fecha, hora: r.hora })),
      tap((orden) => {
        for (const i of o.items) this.analitica.registrar({ tipo: "canje", itemId: i.id, itemTipo: i.tipo });
        this.setItems([]);
        this.ultimaOrden.set(orden);
      }),
    );
  }
}
