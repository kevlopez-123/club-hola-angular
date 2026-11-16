import { describe, expect, it } from "vitest";
import { cargarQr } from "./qr";

describe("cargarQr", () => {
  it("devuelve la librería con sus funciones en la raíz (toDataURL y create)", async () => {
    const QR = await cargarQr();
    expect(typeof QR.toDataURL).toBe("function");
    expect(typeof QR.create).toBe("function");
  });
  it("create arma la matriz de módulos del QR", async () => {
    const QR = await cargarQr();
    const q = QR.create("MOT-8H2K9QAZ", { errorCorrectionLevel: "M" });
    expect(q.modules.size).toBeGreaterThan(20);
  });
});
