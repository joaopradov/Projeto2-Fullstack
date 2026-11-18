import test from "node:test";
import assert from "node:assert/strict";
import {
  cpfValido,
  centavos,
  dividirParcelas,
  calcularFatura,
  dataValida,
  periodoAnterior,
} from "../src/models/regras.js";
test("CPF: válido, inválido e sequência repetida", () => {
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("52998224724"), false);
  assert.equal(cpfValido("11111111111"), false);
});
test("centavos: precisão e rejeição de formatos inválidos", () => {
  assert.equal(centavos("100.01"), 10001);
  for (const valor of ["0", "-1", "1.001", "NaN", "1e3", "1,00"])
    assert.throws(() => centavos(valor));
});
test("parcelamento: resto inteiro na primeira parcela", () => {
  assert.deepEqual(dividirParcelas(10000, 3), [3334, 3333, 3333]);
  assert.deepEqual(dividirParcelas(100, 6), [20, 16, 16, 16, 16, 16]);
  assert.throws(() => dividirParcelas(2, 3));
});
for (const [nome, compra, fecha, vence, parcela, esperado] of [
  [
    "antes do fechamento",
    "2026-11-02",
    3,
    10,
    1,
    { fechamento: "2026-11-03", vencimento: "2026-11-10" },
  ],
  [
    "no fechamento",
    "2026-11-03",
    3,
    10,
    1,
    { fechamento: "2026-12-03", vencimento: "2026-12-10" },
  ],
  [
    "virada do ano",
    "2026-12-28",
    25,
    5,
    1,
    { fechamento: "2027-01-25", vencimento: "2027-02-05" },
  ],
  [
    "terceira parcela",
    "2026-12-20",
    25,
    5,
    3,
    { fechamento: "2027-02-25", vencimento: "2027-03-05" },
  ],
  [
    "fechamento ajustado em fevereiro",
    "2027-02-28",
    31,
    5,
    1,
    { fechamento: "2027-03-31", vencimento: "2027-04-05" },
  ],
  [
    "ano bissexto",
    "2028-02-28",
    31,
    5,
    1,
    { fechamento: "2028-02-29", vencimento: "2028-03-05" },
  ],
  [
    "dias iguais vencem no mês seguinte",
    "2026-11-02",
    3,
    3,
    1,
    { fechamento: "2026-11-03", vencimento: "2026-12-03" },
  ],
])
  test(nome, () =>
    assert.deepEqual(calcularFatura(compra, fecha, vence, parcela), esperado),
  );
test("data inexistente é rejeitada", () => {
  assert.throws(() => dataValida("2026-02-30"));
  assert.equal(dataValida("2028-02-29"), "2028-02-29");
});
test("comparação de meses completos e intervalos personalizados", () => {
  assert.deepEqual(periodoAnterior("2026-10-01", "2026-10-31"), {
    inicio: "2026-09-01",
    fim: "2026-09-30",
  });
  assert.deepEqual(periodoAnterior("2026-10-10", "2026-10-12"), {
    inicio: "2026-10-07",
    fim: "2026-10-09",
  });
});
