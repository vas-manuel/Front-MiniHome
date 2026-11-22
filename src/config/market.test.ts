import { describe, expect, it } from "vitest";
import { ENABLED_CURRENCIES, ENABLED_LANGUAGES, enabledCurrency, enabledLanguage } from "./market";
import { formatMoney } from "../utils/format";

describe("mercado actual: Chile", () => {
  it("solo español y pesos chilenos", () => {
    expect(ENABLED_LANGUAGES).toEqual(["es"]);
    expect(ENABLED_CURRENCIES).toEqual(["CLP"]);
  });

  it("un hogar con otro idioma o moneda guardados se muestra en es / CLP", () => {
    expect(enabledLanguage("en")).toBe("es");
    expect(enabledLanguage(undefined)).toBe("es");
    expect(enabledCurrency("USD")).toBe("CLP");
    expect(formatMoney(45990, enabledCurrency("EUR"), "es-CL")).toBe("$45.990");
  });
});
