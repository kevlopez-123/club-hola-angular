/**
 * Markdown mínimo y seguro para los textos legales y de ayuda: se escapa todo el HTML y solo se generan etiquetas conocidas.
 * Soporta: # a ####, **negrita**, *cursiva*, [enlaces](https://…), listas con - o 1., citas con >, líneas --- y párrafos.
 * Contenido enriquecido: ![texto alternativo](https://imagen), [btn:Texto del botón](https://enlace) y, en una línea sola,
 * @video(https://www.youtube.com/watch?v=… o https://…/video.mp4).
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Solo enlaces web, correo, teléfono, internos (/ruta) y anclas (#ancla). */
const urlSegura = (u: string) => /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u.trim());

/** Solo imágenes y videos por https o del propio sitio. */
const urlMedia = (u: string) => /^(https:\/\/|\/)/i.test(u.trim());

/** Video de YouTube (incrustado sin cookies) o archivo mp4/webm; cualquier otra cosa no genera nada. */
export function videoAHtml(url: string): string {
  const u = url.trim();
  if (!urlMedia(u)) return "";
  const yt = /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/)([\w-]{11})/i.exec(u);
  if (yt) {
    return `<div class="md-video"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="Video" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture"></iframe></div>`;
  }
  if (/\.(mp4|webm)(\?[^#]*)?$/i.test(u)) return `<div class="md-video"><video controls preload="metadata" src="${esc(u)}"></video></div>`;
  return "";
}

export function mdEnLinea(texto: string): string {
  let t = esc(texto);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
    const u = url.replace(/&amp;/g, "&");
    return urlMedia(u) ? `<img src="${esc(u)}" alt="${alt}" loading="lazy">` : alt;
  });
  t = t.replace(/\[btn:([^\]]+)\]\(([^)\s]+)\)/g, (_m, txt: string, url: string) => {
    const u = url.replace(/&amp;/g, "&");
    if (!urlSegura(u)) return txt;
    const externo = /^https?:\/\//i.test(u);
    return `<a class="md-btn" href="${esc(u)}"${externo ? ' target="_blank" rel="noopener noreferrer"' : ""}>${txt}</a>`;
  });
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
    const video = /^@video\((\S+)\)$/.exec(l.trim());
    if (!l.trim()) cerrarTodo();
    else if (video) {
      cerrarTodo();
      out.push(videoAHtml(video[1]!));
    } else if (h) {
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
