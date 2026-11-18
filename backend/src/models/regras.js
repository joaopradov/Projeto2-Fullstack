// Funções puras: podem ser testadas sem Express nem banco.
export function falha(status, mensagem, campos = {}) {
  return Object.assign(new Error(mensagem), { status, campos });
}
export function exigir(condicao, campo, mensagem) {
  if (!condicao) throw falha(400, "Dados inválidos.", { [campo]: mensagem });
}
export function texto(valor, campo, maximo) {
  exigir(
    typeof valor === "string" &&
      valor.trim().length > 0 &&
      valor.trim().length <= maximo,
    campo,
    `Informe um texto de 1 a ${maximo} caracteres.`,
  );
  return valor.trim();
}
export function inteiro(valor, campo, min = 1, max = 2147483647) {
  exigir(
    /^[0-9]+$/.test(String(valor)) &&
      Number.isSafeInteger(Number(valor)) &&
      Number(valor) >= min &&
      Number(valor) <= max,
    campo,
    `Informe um inteiro entre ${min} e ${max}.`,
  );
  return Number(valor);
}
export function centavos(valor, campo = "valor", zero = false) {
  const s = String(valor ?? "");
  exigir(
    /^\d{1,10}(\.\d{1,2})?$/.test(s),
    campo,
    "Informe um valor decimal com até duas casas, usando ponto.",
  );
  const [reais, fracao = ""] = s.split(".");
  const n = Number(reais) * 100 + Number(fracao.padEnd(2, "0"));
  exigir(
    n >= (zero ? 0 : 1) && n <= 999999999999,
    campo,
    "Valor fora do intervalo permitido.",
  );
  return n;
}
export function decimal(n) {
  return `${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;
}
export function cpfValido(cpf) {
  const d = String(cpf).replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}
export function dataValida(valor, campo = "data") {
  exigir(
    typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor),
    campo,
    "Use uma data válida no formato AAAA-MM-DD.",
  );
  const d = new Date(`${valor}T12:00:00Z`);
  exigir(
    !Number.isNaN(d.getTime()) &&
      d.toISOString().slice(0, 10) === valor &&
      valor >= "1900-01-01" &&
      valor <= "9998-12-31",
    campo,
    "Data inválida.",
  );
  return valor;
}
export function hoje() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function dataNoMes(ano, mes, dia) {
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimo)))
    .toISOString()
    .slice(0, 10);
}
export function moverMes(data, meses, dia = Number(data.slice(8, 10))) {
  return dataNoMes(
    Number(data.slice(0, 4)),
    Number(data.slice(5, 7)) - 1 + meses,
    dia,
  );
}
export function somarDias(data, dias) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
export function calcularFatura(compra, fechamento, vencimento, parcela = 1) {
  const fechaNoMes = moverMes(compra, 0, fechamento);
  const fecha = moverMes(
    compra,
    (compra >= fechaNoMes ? 1 : 0) + parcela - 1,
    fechamento,
  );
  return {
    fechamento: fecha,
    vencimento: moverMes(fecha, vencimento > fechamento ? 0 : 1, vencimento),
  };
}
export function dividirParcelas(valorCentavos, quantidade) {
  exigir(
    valorCentavos >= quantidade,
    "totalParcelas",
    "Cada parcela deve valer ao menos um centavo.",
  );
  const base = Math.floor(valorCentavos / quantidade);
  return Array.from(
    { length: quantidade },
    (_, i) => base + (i === 0 ? valorCentavos % quantidade : 0),
  );
}
export function periodo(query = {}) {
  const atual = hoje();
  const inicio = dataValida(
    query.inicio || atual.slice(0, 7) + "-01",
    "inicio",
  );
  const fim = dataValida(query.fim || moverMes(atual, 0, 31), "fim");
  exigir(inicio <= fim, "fim", "O fim deve ser igual ou posterior ao início.");
  return { inicio, fim };
}
export function periodoAnterior(inicio, fim) {
  if (inicio.endsWith("-01") && fim === moverMes(inicio, 0, 31)) {
    return { inicio: moverMes(inicio, -1, 1), fim: moverMes(inicio, -1, 31) };
  }
  const dias = Math.round((new Date(fim) - new Date(inicio)) / 86400000) + 1;
  return { inicio: somarDias(inicio, -dias), fim: somarDias(inicio, -1) };
}
