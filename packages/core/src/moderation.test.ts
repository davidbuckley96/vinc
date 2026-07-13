import { describe, expect, it } from "vitest";

import { containsContactInfo, prohibitedContentCategory } from "./moderation";

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

  it("catches disguised contact (spaced digits, spelled-out, social handles)", () => {
    expect(containsContactInfo("chama nesse 9 9 9 9 9 0 0 0 0")).toBe(true);
    expect(containsContactInfo("zap nove nove nove nove oito sete seis")).toBe(true);
    expect(containsContactInfo("meu insta é @fulano_123")).toBe(true);
    expect(containsContactInfo("me acha no instagram fulanodetal")).toBe(true);
    expect(containsContactInfo("telegram: fulano.oficial")).toBe(true);
    expect(containsContactInfo("me chama no arroba fulano")).toBe(true);
  });

  it("lets ordinary announcements through", () => {
    expect(containsContactInfo("Faxina completa, das 14:00 às 18:00")).toBe(false);
    expect(containsContactInfo("Pago R$ 1.500,00 pelo dia todo")).toBe(false);
    expect(containsContactInfo("Apartamento 1201, limpeza de 60m²")).toBe(false);
    expect(containsContactInfo("Cuidar de 2 crianças por 4 horas")).toBe(false);
    expect(containsContactInfo("Preciso de duas pessoas por três horas")).toBe(false);
    expect(containsContactInfo("Mudança: 12 caixas, 3 andares, das 8 às 12h")).toBe(false);
    expect(containsContactInfo("Limpeza de 2 quartos e 1 banheiro, R$ 120")).toBe(false);
  });
});

describe("prohibitedContentCategory", () => {
  it("flags clearly-illegal content (accent-insensitive)", () => {
    expect(prohibitedContentCategory("vendo maconha e cocaína")).toBe("drogas");
    expect(prohibitedContentCategory("preciso de alguém com PISTOLA")).toBe("armas");
    expect(prohibitedContentCategory("garota de programa para a noite")).toBe("sexual");
    expect(prohibitedContentCategory("serviços sexuais")).toBe("sexual");
  });

  it("does not flag ordinary gig ads", () => {
    expect(prohibitedContentCategory("Faxina completa em apartamento")).toBeNull();
    expect(prohibitedContentCategory("Programa de reforma da cozinha")).toBeNull();
    expect(prohibitedContentCategory("Acompanhante de idoso durante o dia")).toBeNull();
    expect(prohibitedContentCategory("Pedreiro para levantar um muro")).toBeNull();
    expect(prohibitedContentCategory("Cuidar de crianças à tarde")).toBeNull();
  });
});
