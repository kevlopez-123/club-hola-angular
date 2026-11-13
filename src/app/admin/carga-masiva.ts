import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from "@angular/core";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { ApiService } from "../core/api.service";
import { BrandService } from "../core/brand.service";
import { claveMarca, DEFINICIONES, plantillaConDatos, plantillaDe, prepararCarga, type CtxCarga, type FilaPreparada, type TipoCarga } from "../core/cargas";
import { MAX_FILAS_CARGA } from "../core/cargas";
import { imagenesDeArchivos, mapaImagenes, type ImagenCarga } from "../core/imagenes-carga";
import { leerFilasArchivo } from "../core/leer-archivo";
import { hojaErrores, hojasPlantilla } from "../core/plantillas-xlsx";
import { IconComponent } from "../shared/icon.component";
import { AdminModalComponent, BtnDirective, PillComponent, ToastService, descargarXlsx } from "./kit";
import { AdminSession } from "./session";


/** Filas que se dibujan en la revisión (el resto se cuenta pero no se pinta: la carga puede tener miles). */
const FILAS_VISIBLES = 300;

/**
 * Carga masiva de beneficios, marcas, participantes y códigos, con el mismo recorrido para todas: plantilla de Excel,
 * imágenes (varias a la vez o un ZIP), revisión fila por fila y confirmación. Las filas con error no frenan a las demás y se
 * descargan en un Excel para corregirlas. Todo queda en Importaciones.
 */
@Component({
  selector: "a-carga-masiva",
  imports: [RouterLink, AdminModalComponent, BtnDirective, IconComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-modal [open]="abierto()" [wide]="true" [title]="def().titulo" (closed)="cerrado.emit()">
      <ol class="mb-5 flex gap-2 text-sm" aria-label="Pasos de la carga">
        @for (l of pasos; track l; let i = $index) {
          <li [class]="'flex-1 rounded-full px-3 py-1.5 text-center font-semibold ' + (paso() === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')" [attr.aria-current]="paso() === i + 1 ? 'step' : null">{{ i + 1 }}. {{ l }}</li>
        }
      </ol>

      @switch (paso()) {
        @case (1) {
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/50 p-4">
              <p class="text-sm"><b>1.</b> Descarga la plantilla, llena la hoja «Datos» y guárdala como Excel (.xlsx).</p>
              <div class="flex flex-wrap gap-2">
                <button aBtn variant="outline" (click)="descargarPlantilla()"><app-icon name="Download" class="h-4 w-4" /> Descargar plantilla</button>
                @if (def().coleccion) { <button aBtn variant="outline" [disabled]="exportando()" (click)="descargarCatalogo()"><app-icon name="FileSpreadsheet" class="h-4 w-4" /> {{ exportando() ? 'Preparando…' : 'Descargar lo que hay para editarlo' }}</button> }
              </div>
            </div>

            @if (esCodigos()) {
              <div class="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
                <label class="block text-sm font-medium">Beneficio
                  <select class="select-field mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3" aria-label="Beneficio" (change)="beneficio.set($any($event.target).value)">
                    @for (r of beneficios(); track r.id) { <option [value]="r.id" [selected]="r.id === beneficio()">{{ r.marca }} · {{ r.nombre }}</option> }
                  </select>
                </label>
                <label class="block text-sm font-medium">Vencimiento de los códigos
                  <input type="date" class="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3" aria-label="Vencimiento de los códigos" [min]="hoyIso" [value]="vence()" (input)="vence.set($any($event.target).value)" />
                </label>
              </div>
            }

            @if (def().conImagenes) {
              <div class="rounded-2xl border border-border p-4">
                <p class="text-sm"><b>2.</b> Imágenes <span class="text-muted-foreground">(opcional)</span>: sube varias a la vez o un ZIP. En la plantilla se enlazan por el <b>nombre del archivo</b> (por ejemplo <code>laptop-1.jpg</code>).</p>
                <label class="mt-3 grid cursor-pointer place-items-center gap-1 rounded-xl border-2 border-dashed border-border p-5 text-center text-sm text-muted-foreground hover:border-primary">
                  <app-icon name="Upload" class="h-6 w-6" />
                  <span><b class="text-foreground">Elegir imágenes o un ZIP</b> · JPG, PNG, WebP, GIF o SVG</span>
                  <input type="file" class="sr-only" aria-label="Subir imágenes" multiple accept="image/*,.zip" (change)="subirImagenes($any($event.target))" />
                </label>
                @if (procesandoImagenes()) { <p role="status" class="mt-2 text-sm text-muted-foreground">Preparando imágenes…</p> }
                @if (imagenes().length) {
                  <p class="mt-3 text-sm font-semibold" role="status">{{ imagenes().length }} {{ imagenes().length === 1 ? 'imagen lista' : 'imágenes listas' }} ({{ pesoImagenes() }}).</p>
                  <ul class="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto" aria-label="Imágenes listas">
                    @for (i of imagenes(); track i.nombre) { <li class="flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs"><img [src]="i.url" alt="" class="h-5 w-5 rounded object-cover" />{{ i.original }}</li> }
                  </ul>
                }
                @if (omitidas().length) {
                  <ul class="mt-3 space-y-1 text-xs text-destructive" aria-label="Imágenes omitidas">
                    @for (o of omitidas(); track o.nombre + o.motivo) { <li><b>{{ o.nombre }}</b>: {{ o.motivo }}</li> }
                  </ul>
                }
              </div>
            }

            <div class="rounded-2xl border border-border p-4">
              <p class="text-sm"><b>{{ def().conImagenes ? '3' : '2' }}.</b> Sube el archivo lleno.</p>
              <label class="mt-3 grid cursor-pointer place-items-center gap-1 rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:border-primary">
                <app-icon name="FileSpreadsheet" class="h-8 w-8" />
                <span><b class="text-foreground">Seleccionar la plantilla en Excel (.xlsx)</b></span>
                <input type="file" class="sr-only" aria-label="Subir archivo de la carga" accept=".xlsx,.csv,.txt" (change)="leer($any($event.target).files?.[0])" />
              </label>
              @if (leyendo()) { <p role="status" class="mt-2 text-sm text-muted-foreground">Revisando el archivo…</p> }
              @if (errorArchivo()) { <p role="alert" class="mt-2 text-sm font-semibold text-destructive">{{ errorArchivo() }}</p> }
            </div>
          </div>
        }

        @case (2) {
          <p class="mb-3 text-sm text-muted-foreground" aria-live="polite">
            <b class="text-foreground">{{ archivo() }}</b> · {{ filas().length }} {{ filas().length === 1 ? 'fila' : 'filas' }}
              · <span class="text-foreground">{{ resumen().crear }} por crear</span> · <span class="text-foreground">{{ resumen().actualizar }} por actualizar</span>
            · <span [class]="errores() ? 'font-semibold text-destructive' : ''">{{ errores() }} con errores</span>
          </p>
          @if (imagenesSinUsar().length) {
            <p class="mb-3 rounded-xl bg-aviso-fondo p-3 text-xs text-aviso" role="status">Estas imágenes no las usa ninguna fila: {{ imagenesSinUsar().join(', ') }}.</p>
          }
          <div class="max-h-[22rem] overflow-auto rounded-xl border border-border">
            <table class="w-full min-w-[560px] text-sm">
              <caption class="sr-only">Revisión de las filas del archivo</caption>
              <thead class="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr><th class="px-3 py-2">Fila</th><th class="px-3 py-2">{{ columna1() }}</th><th class="px-3 py-2">{{ columna2() }}</th><th class="px-3 py-2">Resultado</th></tr>
              </thead>
              <tbody>
                @for (f of visibles(); track f.fila) {
                  <tr [class]="'border-t border-border ' + (f.error ? 'bg-destructive/5' : '')">
                    <td class="px-3 py-2">{{ f.fila }}</td>
                    <td class="px-3 py-2">{{ f.crudos[0] }}</td>
                    <td class="px-3 py-2">{{ detalle(f) }}</td>
                    <td class="px-3 py-2">
                      @if (f.error) {
                        <span class="inline-flex items-start gap-1 font-semibold text-destructive"><app-icon name="AlertTriangle" class="mt-0.5 h-3.5 w-3.5 shrink-0" />{{ f.error }}</span>
                      } @else if (f.accion) {
                        <a-pill [tone]="f.accion === 'crear' ? 'ok' : 'info'">{{ f.accion === 'crear' ? 'Se crea' : 'Se actualiza' }}</a-pill>
                      } @else {
                        <span class="inline-flex items-center gap-1 font-semibold"><app-icon name="CheckCircle2" class="h-3.5 w-3.5 text-primary" />OK</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filas().length > visibles().length) { <p class="mt-2 text-xs text-muted-foreground">Se muestran las primeras {{ visibles().length }} filas; el resto también se revisó{{ errores() ? ' (el reporte de errores trae todas las rechazadas)' : '' }}.</p> }
          <p class="mt-3 text-sm text-muted-foreground">Las filas con errores no se cargan. Puedes corregirlas en el archivo y volver a subirlo.</p>
          <div class="mt-5 flex flex-wrap justify-end gap-2">
            @if (errores()) { <button aBtn variant="ghost" (click)="descargarErrores()"><app-icon name="Download" class="h-4 w-4" /> Descargar reporte de errores</button> }
            <button aBtn variant="outline" (click)="paso.set(1)">Cambiar archivo</button>
            <button aBtn [disabled]="!validas() || importando()" (click)="importar()">{{ importando() ? 'Cargando…' : botonImportar() }}</button>
          </div>
        }

        @case (3) {
          <div class="py-6 text-center">
            <app-icon name="CheckCircle2" class="mx-auto h-12 w-12 text-primary" />
            <p class="mt-3 text-lg font-bold">Carga completada</p>
            <p class="text-muted-foreground" role="status">{{ mensajeFinal() }}</p>
            <div class="mt-6 flex flex-wrap justify-center gap-2">
              @if (errores()) { <button aBtn variant="outline" (click)="descargarErrores()"><app-icon name="Download" class="h-4 w-4" /> Descargar reporte de errores</button> }
              <button aBtn (click)="cerrarYAvisar()">Cerrar</button>
            </div>
            <p class="mt-3 text-xs text-muted-foreground">Queda registrada en <a routerLink="/admin/importaciones" class="font-semibold text-primary underline" (click)="cerrarYAvisar()">Importaciones</a>.</p>
          </div>
        }
      }
    </a-modal>
  `,
})
export class CargaMasivaComponent {
  private readonly api = inject(ApiService);
  private readonly brand = inject(BrandService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(AdminSession);

  readonly tipo = input.required<TipoCarga>();
  readonly abierto = input(false);
  readonly cerrado = output<void>();
  /** Se emite al terminar una carga para que la pantalla recargue su lista. */
  readonly terminada = output<void>();

  protected readonly pasos = ["Preparar", "Revisar", "Listo"];
  protected readonly def = computed(() => DEFINICIONES[this.tipo()]);
  protected readonly esCodigos = computed(() => this.tipo() === "codigos");
  protected readonly hoyIso = new Date().toISOString().slice(0, 10);
  /** Códigos: beneficio y vencimiento del lote (se eligen antes de subir el archivo). */
  protected readonly beneficios = signal<{ id: string; marca: string; nombre: string }[]>([]);
  protected readonly beneficio = signal("");
  protected readonly vence = signal(new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10));
  protected readonly omitidosServidor = signal(0);
  /** Códigos: la lista de beneficios se pide al abrir; subir el archivo espera a que llegue. */
  private beneficiosListos: Promise<void> = Promise.resolve();

  protected readonly paso = signal<1 | 2 | 3>(1);
  protected readonly archivo = signal("");
  protected readonly filas = signal<FilaPreparada[]>([]);
  protected readonly leyendo = signal(false);
  protected readonly importando = signal(false);
  protected readonly exportando = signal(false);
  protected readonly errorArchivo = signal("");
  protected readonly imagenes = signal<ImagenCarga[]>([]);
  protected readonly omitidas = signal<{ nombre: string; motivo: string }[]>([]);
  protected readonly procesandoImagenes = signal(false);
  protected readonly hechas = signal({ creados: 0, actualizados: 0, aplicados: 0 });

  protected readonly errores = computed(() => this.filas().filter((f) => f.error).length);
  protected readonly resumen = computed(() => ({ crear: this.filas().filter((f) => f.accion === "crear").length, actualizar: this.filas().filter((f) => f.accion === "actualizar").length }));
  protected readonly validas = computed(() => this.filas().length - this.errores());
  protected readonly visibles = computed(() => this.filas().slice(0, FILAS_VISIBLES));
  protected readonly columna1 = computed(() => (this.tipo() === "participantes" ? "Documento" : this.tipo() === "marcas" ? "Nombre" : "Código"));
  protected readonly columna2 = computed(() => (this.tipo() === "marcas" ? "Sitio web" : this.tipo() === "codigos" ? "" : "Nombre"));
  protected readonly pesoImagenes = computed(() => {
    const kb = this.imagenes().reduce((s, i) => s + i.bytes, 0) / 1024;
    return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
  });
  protected readonly imagenesSinUsar = computed(() => {
    const usadas = new Set(this.filas().flatMap((f) => (f.imagenesUsadas ?? []).map((n) => n.toLowerCase())));
    const sinExt = (n: string) => n.replace(/\.[a-z0-9]{2,5}$/, "");
    return this.imagenes().filter((i) => ![...usadas].some((u) => u === i.nombre || sinExt(u) === sinExt(i.nombre))).map((i) => i.original);
  });
  protected readonly botonImportar = computed(() => {
    const n = this.validas();
    switch (this.tipo()) {
      case "participantes": return `Importar ${n} participantes`;
      case "codigos": return `Cargar ${n} códigos`;
      default: return `Cargar ${n} ${n === 1 ? 'fila' : 'filas'}`;
    }
  });
  protected readonly mensajeFinal = computed(() => {
    const h = this.hechas();
    const omitidas = this.errores();
    const resto = omitidas ? ` · ${omitidas} ${omitidas === 1 ? 'fila omitida' : 'filas omitidas'}` : "";
    if (this.tipo() === "participantes") return `${h.creados} participantes agregados${resto}${this.omitidosServidor() ? ` · ${this.omitidosServidor()} ya existían` : ""}. Recibirán un correo de bienvenida.`;
    if (this.esCodigos()) return `${h.creados} códigos cargados${resto}${this.omitidosServidor() ? ` · ${this.omitidosServidor()} repetidos omitidos` : ""}.`;
    return `${h.creados} creados · ${h.actualizados} actualizados${resto}`;
  });

  constructor() {
    // Cada vez que se abre, parte de cero.
    effect(() => {
      if (!this.abierto()) return;
      untracked(() => this.reiniciar());
    });
  }

  protected fmt = (n: number) => n.toLocaleString("es");
  private reiniciar() {
    this.paso.set(1);
    this.archivo.set("");
    this.filas.set([]);
    this.errorArchivo.set("");
    this.imagenes.set([]);
    this.omitidas.set([]);
    this.hechas.set({ creados: 0, actualizados: 0, aplicados: 0 });
    this.omitidosServidor.set(0);
    if (this.esCodigos()) {
      this.beneficiosListos = firstValueFrom(this.api.get<{ id: string; marca: string; nombre: string }[]>("admin/c/beneficios")).then((l) => { this.beneficios.set(l); this.beneficio.set(l[0]?.id ?? ""); }, () => undefined);
    }
  }

  protected descargarPlantilla() {
    descargarXlsx(`plantilla_${this.tipo()}.xlsx`, hojasPlantilla(plantillaDe(this.tipo())));
  }

  /** El catálogo actual en el mismo formato de la carga: se edita en Excel y se vuelve a subir para actualizarlo. */
  protected async descargarCatalogo() {
    const col = this.def().coleccion;
    if (!col) return;
    this.exportando.set(true);
    try {
      const filas = await firstValueFrom(this.api.get<any[]>(`admin/c/${col}`));
      descargarXlsx(`catalogo_${this.tipo()}.xlsx`, hojasPlantilla(plantillaConDatos(this.tipo(), filas)));
    } catch {
      this.toast.error("No pudimos preparar el archivo. Inténtalo otra vez.");
    } finally {
      this.exportando.set(false);
    }
  }

  protected async subirImagenes(input: HTMLInputElement) {
    const archivos = Array.from(input.files ?? []);
    input.value = "";
    if (!archivos.length) return;
    this.procesandoImagenes.set(true);
    try {
      const r = await imagenesDeArchivos(archivos);
      // Se suman a las que ya estaban (una segunda tanda no borra la primera); si se repite el nombre, gana la nueva.
      const por = new Map(this.imagenes().map((i) => [i.nombre, i]));
      for (const i of r.imagenes) por.set(i.nombre, i);
      this.imagenes.set([...por.values()]);
      this.omitidas.set(r.omitidas);
    } finally {
      this.procesandoImagenes.set(false);
    }
  }

  /** Datos que el servidor ya tiene y que las filas necesitan (marcas, categorías, lo que se va a actualizar). */
  private async contexto(): Promise<CtxCarga> {
    const get = <T>(c: string) => firstValueFrom(this.api.get<T[]>(`admin/c/${c}`));
    const t = this.tipo();
    if (t === "participantes" || t === "codigos") {
      const codigosExistentes = new Set<string>();
      if (t === "codigos") for (const l of await get<any>("lotes")) if (l.beneficioId === this.beneficio()) for (const c of l.codigos ?? []) codigosExistentes.add(String(c));
      return {
        marcas: [], categoriasBeneficio: [], provincias: [], existentes: new Map(), imagenes: new Map(), hoyIso: this.hoyIso,
        digitosDocumento: this.brand.pais().documentos[0]?.digitos ?? 10, codigosExistentes,
      };
    }
    const marcas = await get<{ id: string; nombre: string; web?: string }>("marcas");
    const existentes = new Map<string, any>();
    if (t === "beneficios") for (const b of await get<any>("beneficios")) existentes.set(String(b.id), b);
    if (t === "marcas") for (const m of marcas) existentes.set(claveMarca(m.nombre), m);
    if (t === "locales") for (const l of await get<any>("locales")) existentes.set(String(l.id), l);
    return {
      marcas,
      categoriasBeneficio: t === "beneficios" ? await get("categoriasBeneficio") : [],
      provincias: this.brand.tenant().pais.provincias.map((p) => p.nombre),
      existentes,
      imagenes: mapaImagenes(this.imagenes()),
      hoyIso: new Date().toISOString().slice(0, 10),
    };
  }

  protected async leer(f?: File) {
    if (!f) return;
    this.errorArchivo.set("");
    if (this.esCodigos()) await this.beneficiosListos;
    if (this.esCodigos() && (!this.beneficio() || !this.vence() || this.vence() < this.hoyIso)) { this.errorArchivo.set("Elige el beneficio y una fecha de vencimiento de hoy en adelante."); return; }
    this.leyendo.set(true);
    try {
      const matriz = await leerFilasArchivo(f);
      const r = prepararCarga(this.tipo(), matriz, await this.contexto());
      if (r.errorGeneral) { this.errorArchivo.set(r.errorGeneral); return; }
      if (!r.filas.length) { this.errorArchivo.set("El archivo no tiene filas con datos debajo del encabezado."); return; }
      if (r.filas.length > MAX_FILAS_CARGA) { this.errorArchivo.set(`El archivo tiene ${r.filas.length.toLocaleString("es")} filas; el máximo por carga es ${MAX_FILAS_CARGA.toLocaleString("de-DE")}. Divídelo en varios.`); return; }
      this.archivo.set(f.name);
      this.filas.set(r.filas);
      this.paso.set(2);
    } catch (e: any) {
      this.errorArchivo.set(e?.message === "formato" ? "No pudimos leer el archivo. Usa la plantilla de Excel (.xlsx) y vuelve a subirlo." : (e?.error?.message ?? "No pudimos revisar el archivo. Inténtalo otra vez."));
    } finally {
      this.leyendo.set(false);
    }
  }

  protected detalle(f: FilaPreparada): string {
    return f.crudos[1] ?? "";
  }
  protected async importar() {
    const buenas = this.filas().filter((f) => !f.error);
    if (!buenas.length) return;
    this.importando.set(true);
    try {
      if (this.esCodigos()) {
        const r = await firstValueFrom(this.api.post<{ cargados: number; repetidos: number }>("admin/lotes/cargar", { beneficioId: this.beneficio(), vence: this.vence(), archivo: this.archivo(), codigos: buenas.map((f) => f.entidad) }));
        this.hechas.set({ creados: r.cargados, actualizados: 0, aplicados: 0 });
        this.omitidosServidor.set(r.repetidos);
      } else if (this.tipo() === "participantes") {
        const r = await firstValueFrom(this.api.post<{ creados: number; omitidos: string[] }>("admin/c/participantes/bulk", { items: buenas.map((f) => f.entidad) }));
        this.hechas.set({ creados: r.creados, actualizados: 0, aplicados: 0 });
        this.omitidosServidor.set(r.omitidos?.length ?? 0);
      } else {
        const r = await firstValueFrom(this.api.post<{ creados: number; actualizados: number }>(`admin/c/${this.def().coleccion}/upsert`, { items: buenas.map((f) => f.entidad) }));
        this.hechas.set({ creados: r.creados, actualizados: r.actualizados, aplicados: 0 });
      }
      const d = this.def();
      await firstValueFrom(this.api.post("admin/importaciones", {
        tipo: d.nombre, archivo: this.archivo(), usuario: this.session.usuario()?.nombre, total: this.filas().length, importadas: buenas.length,
        columnas: d.columnas.map((c) => c.titulo), errores: this.erroresReporte(),
      }));
      this.toast.show(this.esCodigos() ? "Códigos cargados" : "Archivo cargado");
      this.terminada.emit();
      this.paso.set(3);
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? "No pudimos completar la carga. No se guardó nada de este archivo.");
    } finally {
      this.importando.set(false);
    }
  }

  private erroresReporte() {
    return this.filas().filter((f) => f.error).map((f) => ({ fila: f.fila, motivo: f.error!, datos: f.crudos }));
  }
  protected descargarErrores() {
    descargarXlsx(`errores_${this.archivo().replace(/\.[^.]+$/, "") || this.tipo()}.xlsx`, [hojaErrores(this.def().columnas.map((c) => c.titulo), this.erroresReporte())]);
  }
  protected cerrarYAvisar() {
    this.cerrado.emit();
  }
}
