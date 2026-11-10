/**
 * PDF mínimo (una página, texto) con los datos de una cotización. Sirve para que el participante siempre pueda descargar su
 * cotización en la demostración; con un servidor real se entrega el archivo que adjuntó la ejecutiva.
 */
const esc = (s: string) =>
  s
    .replace(/→/g, "->")
    .replace(/€/g, "\\200")
    .replace(/[\\()]/g, (c) => "\\" + c)
    // Latin-1 (acentos y ñ) con escapes octales; lo que no exista en WinAnsi se omite
    .replace(/[^\x20-\x7e]/g, (c) => (c.charCodeAt(0) < 256 ? "\\" + c.charCodeAt(0).toString(8).padStart(3, "0") : "?"));

export function pdfDeTexto(titulo: string, lineas: string[]): Blob {
  const contenido: string[] = ["BT", "/F2 20 Tf", "50 790 Td", `(${esc(titulo)}) Tj`, "ET"];
  let y = 755;
  for (const l of lineas) {
    if (l === "") {
      y -= 10;
      continue;
    }
    const negrita = l.startsWith("## ");
    contenido.push("BT", `${negrita ? "/F2 13" : "/F1 11"} Tf`, `50 ${y} Td`, `(${esc(negrita ? l.slice(3) : l)}) Tj`, "ET");
    y -= negrita ? 22 : 16;
    if (y < 60) break;
  }
  const stream = contenido.join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

/** Descarga un Blob con el nombre indicado. */
export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Convierte un data URL (el PDF que adjuntó la ejecutiva) en Blob. */
export function blobDeDataUrl(dataUrl: string): Blob {
  const [cabecera, datos = ""] = dataUrl.split(",");
  const tipo = /data:([^;]+)/.exec(cabecera ?? "")?.[1] ?? "application/pdf";
  const bin = atob(datos);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}
