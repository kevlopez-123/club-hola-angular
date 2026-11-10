/**
 * Markdown mínimo y seguro para los textos legales: se escapa todo el HTML y solo se generan etiquetas conocidas.
 * Soporta: # a ####, **negrita**, *cursiva*, [enlaces](https://…), listas con - o 1., citas con >, líneas --- y párrafos.
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Solo enlaces web, correo, teléfono, internos (/ruta) y anclas (#ancla). */
const urlSegura = (u: string) => /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u.trim());

export function mdEnLinea(texto: string): string {
  let t = esc(texto);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, txt: string, url: string) => {
    const u = url.replace(/&amp;/g, "&");
    if (!urlSegura(u)) return txt;
    const externo = /^https?:\/\//i.test(u);
    return `<a href="${esc(u)}"${externo ? ' target="_blank" rel="noopener noreferrer"' : ""}>${txt}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return t;
}

export function mdAHtml(md: string): string {
  const lineas = (md ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let parrafo: string[] = [];
  let lista: { tipo: "ul" | "ol"; items: string[] } | null = null;
  let cita: string[] = [];

  const cerrarParrafo = () => {
    if (parrafo.length) out.push(`<p>${mdEnLinea(parrafo.join(" "))}</p>`);
    parrafo = [];
  };
  const cerrarLista = () => {
    if (lista) out.push(`<${lista.tipo}>${lista.items.map((i) => `<li>${mdEnLinea(i)}</li>`).join("")}</${lista.tipo}>`);
    lista = null;
  };
  const cerrarCita = () => {
    if (cita.length) out.push(`<blockquote><p>${mdEnLinea(cita.join(" "))}</p></blockquote>`);
    cita = [];
  };
  const cerrarTodo = () => {
    cerrarParrafo();
    cerrarLista();
    cerrarCita();
  };

  for (const crudo of lineas) {
    const l = crudo.trimEnd();
    const h = /^(#{1,4})\s+(.+)$/.exec(l);
    const li = /^\s*(?:[-*+]|(\d+)[.)])\s+(.+)$/.exec(l);
    const q = /^>\s?(.*)$/.exec(l);
    if (!l.trim()) cerrarTodo();
    else if (h) {
      cerrarTodo();
      out.push(`<h${h[1]!.length}>${mdEnLinea(h[2]!)}</h${h[1]!.length}>`);
    } else if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) {
      cerrarTodo();
      out.push("<hr>");
    } else if (li) {
      cerrarParrafo();
      cerrarCita();
      const tipo = li[1] ? "ol" : "ul";
      if (lista && lista.tipo !== tipo) cerrarLista();
      (lista ??= { tipo, items: [] }).items.push(li[2]!);
    } else if (q) {
      cerrarParrafo();
      cerrarLista();
      cita.push(q[1]!);
    } else {
      cerrarLista();
      cerrarCita();
      parrafo.push(l.trim());
    }
  }
  cerrarTodo();
  return out.join("\n");
}

/** Convierte las secciones antiguas (título + párrafos) en un solo bloque markdown. */
export const seccionesAMarkdown = (secciones: { t: string; p: string[] }[]): string =>
  secciones.map((s) => `## ${s.t}\n\n${s.p.join("\n\n")}`).join("\n\n");

/** Acepta el formato antiguo (lista de secciones) o el nuevo (texto markdown). */
export const legalAMarkdown = (v: unknown): string =>
  typeof v === "string" ? v : Array.isArray(v) ? seccionesAMarkdown(v as { t: string; p: string[] }[]) : "";
