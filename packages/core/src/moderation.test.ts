import { describe, expect, it } from "vitest";

import { containsContactInfo } from "./moderation";

describe("containsContactInfo", () => {
  it("catches phones in common BR formats", () => {
    expect(containsContactInfo("me chama no 99999-0000")).toBe(true);
    expect(containsContactInfo("fone (81) 9 9999 0000 falar com Zé")).toBe(true);
    expect(containsContactInfo("081999990000")).toBe(true);
    expect(containsContactInfo("liga 3222.4444")).toBe(true);
  });

  it("catches e-mails, links and messenger handles", () => {
    expect(containsContactInfo("manda em ze@email.com")).toBe(true);
    expect(containsContactInfo("veja www.meusite.com.br")).toBe(true);
    expect(containsContactInfo("https://wa.me/5581999990000")).toBe(true);
    expect(containsContactInfo("chama no zap 99999999")).toBe(true);
  });

  it("lets ordinary announcements through", () => {
    expect(containsContactInfo("Faxina completa, das 14:00 às 18:00")).toBe(false);
    expect(containsContactInfo("Pago R$ 1.500,00 pelo dia todo")).toBe(false);
    expect(containsContactInfo("Apartamento 1201, limpeza de 60m²")).toBe(false);
    expect(containsContactInfo("Cuidar de 2 crianças por 4 horas")).toBe(false);
  });
});
