import { describe, expect, it } from "vitest";
import { mdAHtml, mdEnLinea } from "./markdown";

describe("markdown con contenido enriquecido", () => {
  it("genera imágenes https y descarta las de otros esquemas", () => {
    expect(mdEnLinea("![logo](https://x.com/a.png)")).toBe('<img src="https://x.com/a.png" alt="logo" loading="lazy">');
    expect(mdEnLinea("![x](javascript:alert)")).toBe("x");
    expect(mdEnLinea("![x](data:text/html;base64,AAA)")).toBe("x");
  });
  it("genera botones y no deja pasar enlaces peligrosos", () => {
    expect(mdEnLinea("[btn:Ir](https://x.com)")).toBe('<a class="md-btn" href="https://x.com" target="_blank" rel="noopener noreferrer">Ir</a>');
    expect(mdEnLinea("[btn:Ir](javascript:alert)")).toBe("Ir");
  });
  it("incrusta YouTube sin cookies y archivos mp4; ignora lo demás", () => {
    expect(mdAHtml("@video(https://www.youtube.com/watch?v=dQw4w9WgXcQ)")).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(mdAHtml("@video(https://youtu.be/dQw4w9WgXcQ)")).toContain("embed/dQw4w9WgXcQ");
    expect(mdAHtml("@video(https://x.com/v.mp4)")).toContain('<video controls preload="metadata" src="https://x.com/v.mp4">');
    expect(mdAHtml("@video(https://malo.com/pagina)")).toBe("");
    expect(mdAHtml("@video(javascript:alert)")).toBe("");
  });
  it("escapa el HTML dentro del texto enriquecido", () => {
    expect(mdAHtml('<script>alert(1)</script> [btn:<b>x</b>](https://x.com)')).not.toContain("<script>");
  });
  it("los enlaces de texto siguen funcionando en una línea", () => {
    expect(mdEnLinea("Participa en la campaña [Ahorra](https://x.com)")).toContain('<a href="https://x.com"');
  });
});
