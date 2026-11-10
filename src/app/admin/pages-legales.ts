import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from "@angular/core";
import { ApiService } from "../core/api.service";
import { diferenciasTexto, NOMBRE_LEGAL, resumenDiff, TIPOS_LEGALES, type LineaDiff, type ResumenLegal, type TipoLegal, type VersionLegal } from "../core/legales";
import { IconComponent } from "../shared/icon.component";
import { MarkdownComponent } from "../shared/markdown.component";
import { AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, INPUT_CLS, PageHeaderComponent, PanelComponent, PillComponent, ToastService } from "./kit";

type Formulario = { texto: string; intro: string; notas: string; vigenteDesde: string };
const hoy = () => new Date().toISOString().slice(0, 10);
const fechaCorta = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

/**
 * Textos legales con control de versiones. Nada publicado se edita: cada cambio es una versión nueva con su resumen, su fecha de
 * vigencia. Los participantes aceptan Términos y Política de privacidad una sola vez, en su primer ingreso; una versión nueva no se les vuelve a pedir.
 */
@Component({
  selector: "a-legales-page",
  imports: [PageHeaderComponent, PanelComponent, BtnDirective, FieldComponent, PillComponent, IconComponent, AdminModalComponent, ConfirmComponent, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Textos legales" desc="Términos y condiciones y Política de privacidad, con historial de versiones. Los participantes los aceptan una sola vez, en su primer ingreso." />

    <div role="tablist" aria-label="Texto legal" class="mb-5 inline-flex rounded-xl border border-border p-0.5">
      @for (t of tipos; track t) {
        <button role="tab" type="button" [attr.aria-selected]="tipo() === t" (click)="tipo.set(t)"
          [class]="'min-h-10 rounded-lg px-4 text-sm font-semibold ' + (tipo() === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')">{{ nombres[t] }}</button>
      }
    </div>

    @if (error()) {
      <div role="alert" class="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{{ error() }} <button aBtn variant="outline" class="ml-2" (click)="cargar()">Reintentar</button></div>
    } @else if (!a()) {
      <div role="status" aria-label="Cargando" class="skeleton h-40 rounded-2xl"></div>
    }

    @if (a(); as r) {
      <div class="grid gap-5 lg:grid-cols-3">
        <a-panel title="Versión en vigor" class="lg:col-span-1">
          @if (r.vigente; as v) {
            <p class="flex flex-wrap items-center gap-2"><span class="text-3xl font-bold">v{{ v.version }}</span> <a-pill tone="ok">Vigente</a-pill></p>
            <p class="mt-1 text-sm text-muted-foreground">Desde el {{ fecha(v.vigenteDesde) }} · publicada por {{ v.publicadaPor }} el {{ fecha(v.publicadaEl) }}</p>
            <p class="mt-3 rounded-xl bg-muted/50 p-3 text-sm"><b>Qué cambió:</b> {{ v.notas }}</p>
          }
          @if (r.programada; as p) {
            <p role="status" class="mt-3 rounded-xl border border-border bg-accent/40 p-3 text-sm">La versión <b>v{{ p.version }}</b> está programada: entra en vigor el {{ fecha(p.vigenteDesde) }}. No se pide aceptarla de nuevo: quienes ya aceptaron quedan con la versión que aceptaron.</p>
          }
          <div class="mt-4" role="group" [attr.aria-label]="'Aceptación de ' + r.nombre">
            <div class="flex items-baseline justify-between text-sm"><span class="font-semibold">{{ r.aceptaron.toLocaleString('es') }} de {{ r.total.toLocaleString('es') }} participantes activos</span><span class="text-muted-foreground">{{ porcentaje(r) }} %</span></div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="img" [attr.aria-label]="'Aceptación: ' + porcentaje(r) + ' %'"><div class="h-full bg-primary" [style.width.%]="porcentaje(r)"></div></div>
            <p class="mt-1.5 text-xs text-muted-foreground">{{ r.pendientes.toLocaleString('es') }} todavía no aceptan: se les pide en su primer ingreso, una sola vez.</p>
          </div>
        </a-panel>

        <a-panel title="Nueva versión" class="lg:col-span-2">
          @if (r.borrador) { <p class="mb-3 text-xs text-muted-foreground">Borrador guardado por {{ r.borrador.por }} el {{ fecha(r.borrador.actualizadoEl) }}.</p> }
          <p class="mb-3 text-sm text-muted-foreground">Edita el texto y publícalo como versión nueva; la actual se conserva en el historial. Formato Markdown (<code>## Título</code>, <code>**negrita**</code>, listas con <code>-</code>).</p>
          <a-field label="Subtítulo de la página (opcional)" class="mb-4">
            <input [class]="input" [value]="form().intro" (input)="set({ intro: $any($event.target).value })" />
          </a-field>
          <div class="grid gap-4 lg:grid-cols-2">
            <a-field [label]="'Texto de ' + r.nombre">
              <textarea [class]="input + ' h-80 py-2 font-mono text-[13px] leading-6'" [value]="form().texto" (input)="set({ texto: $any($event.target).value })"></textarea>
            </a-field>
            <div><span class="mb-1.5 block text-sm font-medium">Vista previa</span><div class="h-80 overflow-y-auto rounded-xl border border-border bg-card p-4"><app-markdown [texto]="form().texto" /></div></div>
          </div>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <a-field label="Qué cambió (queda en el historial)" [requerido]="true">
              <textarea [class]="input + ' h-24 py-2'" [value]="form().notas" placeholder="Ej. Se aclara la vigencia de los puntos." (input)="set({ notas: $any($event.target).value })"></textarea>
            </a-field>
            <div class="space-y-3">
              <a-field label="Vigente desde">
                <input type="date" [class]="input" [attr.min]="hoy" [value]="form().vigenteDesde" (input)="set({ vigenteDesde: $any($event.target).value })" />
              </a-field>
              <p class="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Publicar una versión nueva <b class="text-foreground">no pide aceptar de nuevo</b> ni envía avisos: la aceptación se registra una sola vez, en el primer ingreso de cada participante.</p>
            </div>
          </div>
          @if (errorPublicar()) { <p role="alert" class="mt-3 text-sm font-semibold text-destructive">{{ errorPublicar() }}</p> }
          <div class="det-pie">
            @if (r.borrador) { <button aBtn variant="ghost" (click)="descartar()">Descartar borrador</button> }
            <button aBtn variant="outline" [disabled]="!hayCambios()" (click)="compararConVigente()"><app-icon name="ArrowLeftRight" class="h-4 w-4" /> Ver cambios</button>
            <button aBtn variant="outline" [disabled]="!sucio()" (click)="guardarBorrador()">Guardar borrador</button>
            <button aBtn [disabled]="!hayCambios()" (click)="pedirPublicar()">Publicar versión</button>
          </div>
        </a-panel>
      </div>

      <a-panel title="Historial de versiones" class="mt-5 block">
        <div class="adm-wrap">
          <table class="adm-table" [attr.aria-label]="'Historial de ' + r.nombre">
            <thead><tr><th>Versión</th><th>Estado</th><th>Vigente desde</th><th>Publicada</th><th>Qué cambió</th><th aria-label="Ver"></th><th aria-label="Acciones"></th></tr></thead>
            <tbody>
              @for (v of r.versiones; track v.version) {
                <tr>
                  <td><b>Versión {{ v.version }}</b></td>
                  <td class="det-completo det-chip"><a-pill [tone]="estadoDe(r, v) === 'Vigente' ? 'ok' : estadoDe(r, v) === 'Programada' ? 'warn' : 'muted'">{{ estadoDe(r, v) }}</a-pill></td>
                  <td>{{ fecha(v.vigenteDesde) }}</td>
                  <td>{{ v.publicadaPor }}<span class="block text-xs text-muted-foreground">{{ fecha(v.publicadaEl) }}</span></td>
                  <td class="adm-ancha">{{ v.notas }}</td>
                  <td class="det-ojo"><button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver la versión ' + v.version" title="Ver el texto" (click)="ver.set(v)"><app-icon name="Eye" class="h-4 w-4" /></button></td>
                  <td>
                    @if (v.version !== r.vigente?.version && r.vigente) { <button aBtn variant="ghost" [attr.aria-label]="'Comparar la versión ' + v.version + ' con la vigente'" (click)="compararVersion(r, v)">Comparar con la vigente</button> }
                    <button aBtn variant="ghost" [attr.aria-label]="'Restaurar la versión ' + v.version + ' como borrador'" (click)="restaurar(v)">Restaurar como borrador</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </a-panel>
    }

    <a-modal [open]="!!ver()" [wide]="true" [title]="(a()?.nombre ?? '') + ' · versión ' + (ver()?.version ?? '')" (closed)="ver.set(null)">
      @if (ver(); as v) {
        <p class="mb-3 text-sm text-muted-foreground">Vigente desde el {{ fecha(v.vigenteDesde) }} · publicada por {{ v.publicadaPor }} · {{ v.notas }}</p>
        <div class="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card p-4"><app-markdown [texto]="v.texto" /></div>
        <div class="det-pie"><button aBtn variant="outline" (click)="ver.set(null)">Cerrar</button></div>
      }
    </a-modal>

    <a-modal [open]="!!comparacion()" [wide]="true" [title]="comparacion()?.titulo ?? ''" (closed)="comparacion.set(null)">
      @if (comparacion(); as c) {
        <p class="mb-3 text-sm" role="status"><b class="text-primary">+{{ c.resumen.agregadas }}</b> líneas agregadas · <b class="text-destructive">−{{ c.resumen.quitadas }}</b> quitadas</p>
        <div class="max-h-[60vh] overflow-y-auto rounded-xl border border-border font-mono text-[13px] leading-6" role="region" aria-label="Diferencias">
          @for (l of c.lineas; track $index) {
            @if (l.tipo !== 'igual' || c.completo) {
              <div [class]="'whitespace-pre-wrap px-3 ' + (l.tipo === 'agregada' ? 'bg-primary/10' : l.tipo === 'quitada' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground')">
                <span class="mr-2 select-none font-bold">{{ l.tipo === 'agregada' ? '+' : l.tipo === 'quitada' ? '−' : ' ' }}</span>{{ l.texto || ' ' }}
              </div>
            }
          }
        </div>
        <div class="det-pie">
          <button aBtn variant="ghost" (click)="c.completo = !c.completo; comparacion.set({ ...c })">{{ c.completo ? 'Ver solo los cambios' : 'Ver el texto completo' }}</button>
          <button aBtn variant="outline" (click)="comparacion.set(null)">Cerrar</button>
        </div>
      }
    </a-modal>

    <a-confirm [open]="confirmar()" [title]="'¿Publicar la versión ' + siguiente() + ' de ' + (a()?.nombre ?? '') + '?'" confirmLabel="Publicar" (closed)="confirmar.set(false)" (confirmed)="publicar()">
      {{ form().vigenteDesde > hoy ? 'Entrará en vigor el ' + fecha(form().vigenteDesde) + '.' : 'Entra en vigor desde ahora.' }} Los participantes que ya aceptaron no tendrán que aceptarla de nuevo; la leerán en la página {{ a()?.nombre }} del sitio.
      <span class="mt-2 block text-xs">Una versión publicada no se puede editar: para corregirla, publica otra.</span>
    </a-confirm>
  `,
})
export class LegalesPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly tipos = TIPOS_LEGALES;
  protected readonly nombres = NOMBRE_LEGAL;
  protected readonly hoy = hoy();
  protected readonly fecha = fechaCorta;

  protected readonly tipo = signal<TipoLegal>("terminos");
  private readonly res = signal<Record<TipoLegal, ResumenLegal> | null>(null);
  protected readonly error = signal("");
  protected readonly a = computed(() => this.res()?.[this.tipo()] ?? null);
  protected readonly form = signal<Formulario>({ texto: "", intro: "", notas: "", vigenteDesde: hoy() });
  /** Estado del formulario tal como se cargó (para saber si hay algo sin guardar). */
  private readonly base = signal("");
  protected readonly errorPublicar = signal("");
  protected readonly ver = signal<VersionLegal | null>(null);
  protected readonly comparacion = signal<{ titulo: string; lineas: LineaDiff[]; resumen: { agregadas: number; quitadas: number }; completo: boolean } | null>(null);
  protected readonly confirmar = signal(false);

  protected readonly sucio = computed(() => JSON.stringify(this.form()) !== this.base());
  protected readonly hayCambios = computed(() => {
    const v = this.a()?.vigente;
    const f = this.form();
    return !!v && (f.texto.trim() !== v.texto.trim() || f.intro !== v.intro);
  });
  protected readonly siguiente = computed(() => (this.a()?.versiones[0]?.version ?? 0) + 1);

  constructor() {
    this.cargar();
    // Al cambiar de documento (o al recibir datos nuevos) el formulario parte del borrador guardado o de la versión vigente.
    effect(() => {
      const r = this.a();
      untracked(() => {
        if (!r) return;
        const b = r.borrador;
        const f: Formulario = b ? { texto: b.texto, intro: b.intro, notas: b.notas, vigenteDesde: b.vigenteDesde < hoy() ? hoy() : b.vigenteDesde }
          : { texto: r.vigente?.texto ?? "", intro: r.vigente?.intro ?? "", notas: "", vigenteDesde: hoy() };
        this.form.set(f);
        this.base.set(JSON.stringify(f));
        this.errorPublicar.set("");
      });
    });
  }

  protected cargar() {
    this.error.set("");
    this.api.get<Record<TipoLegal, ResumenLegal>>("admin/legales").subscribe({ next: (r) => this.res.set(r), error: () => this.error.set("No pudimos cargar los textos legales. Revisa tu conexión e inténtalo otra vez.") });
  }

  protected set(c: Partial<Formulario>) {
    this.form.update((f) => ({ ...f, ...c }));
    this.errorPublicar.set("");
  }
  protected porcentaje(r: ResumenLegal) {
    return r.total ? Math.round((r.aceptaron / r.total) * 100) : 100;
  }
  protected estadoDe(r: ResumenLegal, v: VersionLegal) {
    return v.version === r.vigente?.version ? "Vigente" : v.version === r.programada?.version ? "Programada" : "Anterior";
  }

  private actualizar(r: ResumenLegal) {
    this.res.update((x) => ({ ...(x as Record<TipoLegal, ResumenLegal>), [r.tipo]: r }));
  }
  protected guardarBorrador() {
    this.api.put<ResumenLegal>(`admin/legales/${this.tipo()}/borrador`, this.form()).subscribe({
      next: (r) => { this.actualizar(r); this.toast.show("Borrador guardado"); },
      error: (e) => this.errorPublicar.set(e?.error?.message ?? "No se pudo guardar el borrador."),
    });
  }
  protected descartar() {
    this.api.delete<ResumenLegal>(`admin/legales/${this.tipo()}/borrador`).subscribe((r) => { this.actualizar(r); this.toast.show("Borrador descartado"); });
  }
  protected restaurar(v: VersionLegal) {
    this.api.post<ResumenLegal>(`admin/legales/${this.tipo()}/restaurar/${v.version}`, {}).subscribe((r) => { this.actualizar(r); this.toast.show(`La versión ${v.version} quedó como borrador`); });
  }
  protected pedirPublicar() {
    if (this.form().notas.trim().length < 10) { this.errorPublicar.set("Explica en pocas palabras qué cambió (mínimo 10 caracteres): queda en el historial."); return; }
    this.errorPublicar.set("");
    this.confirmar.set(true);
  }
  protected publicar() {
    this.api.post<ResumenLegal>(`admin/legales/${this.tipo()}/publicar`, this.form()).subscribe({
      next: (r) => { this.actualizar(r); this.toast.show(`Versión ${r.versiones[0]!.version} publicada`); },
      error: (e) => this.errorPublicar.set(e?.error?.message ?? "No se pudo publicar."),
    });
  }

  protected compararConVigente() {
    const v = this.a()?.vigente;
    if (v) this.abrirComparacion(`Cambios de tu borrador frente a la versión ${v.version}`, v.texto, this.form().texto);
  }
  protected compararVersion(r: ResumenLegal, v: VersionLegal) {
    if (r.vigente) this.abrirComparacion(`Versión ${v.version} → versión ${r.vigente.version} (vigente)`, v.texto, r.vigente.texto);
  }
  private abrirComparacion(titulo: string, antes: string, despues: string) {
    const lineas = diferenciasTexto(antes, despues);
    this.comparacion.set({ titulo, lineas, resumen: resumenDiff(lineas), completo: false });
  }
}
