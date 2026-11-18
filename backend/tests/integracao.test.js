import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
// Banco exclusivo: nunca limpar os dados de demonstração ou do usuário.
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "Configure TEST_DATABASE_URL terminando em _test e aplique as migrations nesse banco.",
  );
process.env.DATABASE_URL = url;
const { app } = await import("../src/server.js");
const { pool } = await import("../src/config/database.js");
const { transacao } = await import("../src/models/transacao.js");
const { hoje } = await import("../src/models/regras.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function req(path, method = "GET", body, token) {
  const r = await fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: r.status === 204 ? null : await r.json() };
}
test("fluxo completo com PostgreSQL real", async (t) => {
  try {
    await pool.query(
      "TRUNCATE lancamentos,fontes_destinos,categorias,usuarios RESTART IDENTITY CASCADE",
    );
    const a = {
      nome: "Ana Teste",
      email: "ana@teste.com",
      cpf: "529.982.247-25",
      senha: "Teste12345",
      confirmacaoSenha: "Teste12345",
    };
    const b = {
      ...a,
      nome: "Bruno",
      email: "bruno@teste.com",
      cpf: "11144477735",
    };
    await t.test("cadastro atômico e sem hash na resposta", async () => {
      const r = await req("/auth/cadastro", "POST", a);
      assert.equal(r.status, 201);
      assert.equal(r.data.senha_hash, undefined);
      assert.equal((await req("/auth/cadastro", "POST", b)).status, 201);
    });
    await t.test("e-mail normalizado duplicado", async () => {
      const r = await req("/auth/cadastro", "POST", {
        ...a,
        email: " ANA@TESTE.COM ",
        cpf: "12345678909",
      });
      assert.equal(r.status, 409);
      assert.ok(r.data.campos.email);
    });
    await t.test("CPF normalizado duplicado", async () => {
      const r = await req("/auth/cadastro", "POST", {
        ...a,
        email: "outra@teste.com",
        cpf: "52998224725",
      });
      assert.equal(r.status, 409);
      assert.ok(r.data.campos.cpf);
    });
    await t.test("CPF e confirmação inválidos", async () => {
      assert.equal(
        (await req("/auth/cadastro", "POST", { ...a, cpf: "11111111111" }))
          .status,
        400,
      );
      assert.equal(
        (
          await req("/auth/cadastro", "POST", {
            ...a,
            confirmacaoSenha: "diferente",
          })
        ).status,
        400,
      );
    });
    await t.test("login inválido genérico", async () => {
      const r = await req("/auth/login", "POST", {
        email: a.email,
        senha: "errada",
      });
      assert.equal(r.status, 401);
      assert.equal(r.data.erro, "E-mail ou senha inválidos.");
    });
    const ta = (await req("/auth/login", "POST", a)).data.token;
    const tb = (await req("/auth/login", "POST", b)).data.token;
    await t.test("token ausente e expirado", async () => {
      assert.equal((await req("/lancamentos")).status, 401);
      const expirado = jwt.sign({}, process.env.JWT_SECRET, {
        subject: "1",
        expiresIn: -1,
        issuer: "financas-api",
        audience: "financas-web",
      });
      assert.equal(
        (await req("/lancamentos", "GET", null, expirado)).status,
        401,
      );
    });
    const cats = (await req("/categorias", "GET", null, ta)).data;
    const catsB = (await req("/categorias", "GET", null, tb)).data;
    const conta = (await req("/fontes-destinos", "GET", null, ta)).data[0];
    let cartao;
    await t.test("cartão exige campos e é criado", async () => {
      assert.equal(
        (
          await req(
            "/fontes-destinos",
            "POST",
            { nome: "Inválido", tipo: "cartao_credito" },
            ta,
          )
        ).status,
        400,
      );
      const r = await req(
        "/fontes-destinos",
        "POST",
        {
          nome: "Cartão",
          tipo: "cartao_credito",
          diaFechamento: 3,
          diaVencimento: 10,
          limite: "1000.00",
        },
        ta,
      );
      assert.equal(r.status, 201);
      cartao = r.data;
    });
    const body = {
      tipo: "saida",
      descricao: "Compra teste",
      valor: "100.00",
      data: hoje(),
      categoriaId: cats.find((c) => c.tipo === "saida").id,
      fonteDestinoId: cartao.id,
      totalParcelas: 3,
    };
    let parcelas;
    await t.test("100 em 3 parcelas e soma exata", async () => {
      const r = await req("/lancamentos", "POST", body, ta);
      assert.equal(r.status, 201);
      parcelas = r.data;
      assert.deepEqual(
        parcelas.map((l) => l.valor),
        ["33.34", "33.33", "33.33"],
      );
      assert.equal(new Set(parcelas.map((l) => l.grupo_parcelamento)).size, 1);
    });
    await t.test(
      "categoria incompatível e categoria de outro usuário",
      async () => {
        assert.equal(
          (
            await req(
              "/lancamentos",
              "POST",
              {
                ...body,
                categoriaId: cats.find((c) => c.tipo === "entrada").id,
              },
              ta,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await req(
              "/lancamentos",
              "POST",
              { ...body, categoriaId: catsB[0].id },
              ta,
            )
          ).status,
          404,
        );
      },
    );
    await t.test("não parcelar conta e não aceitar zero centavo", async () => {
      assert.equal(
        (
          await req(
            "/lancamentos",
            "POST",
            { ...body, fonteDestinoId: conta.id },
            ta,
          )
        ).status,
        400,
      );
      assert.equal(
        (await req("/lancamentos", "POST", { ...body, valor: "0.02" }, ta))
          .status,
        400,
      );
    });
    await t.test("usuário B não lê, edita ou exclui compra de A", async () => {
      for (const method of ["GET", "PUT", "DELETE"])
        assert.equal(
          (
            await req(
              "/lancamentos/" + parcelas[0].id,
              method,
              method === "PUT" ? body : null,
              tb,
            )
          ).status,
          404,
        );
    });
    await t.test("isolamento de cadastros e exclusão vinculada", async () => {
      assert.equal(
        (await req("/categorias/" + body.categoriaId, "DELETE", null, tb))
          .status,
        404,
      );
      assert.equal(
        (await req("/categorias/" + body.categoriaId, "DELETE", null, ta))
          .status,
        409,
      );
      assert.equal(
        (await req("/fontes-destinos/" + cartao.id, "DELETE", null, ta)).status,
        409,
      );
    });
    await t.test("faturas e limite incluem todas as parcelas", async () => {
      const r = await req("/relatorios/faturas", "GET", null, ta);
      assert.equal(r.status, 200);
      assert.equal(r.data[0].faturas.length, 4);
      assert.equal(r.data[0].limiteUtilizado, "100.00");
      assert.equal(r.data[0].limiteDisponivel, "900.00");
    });
    await t.test("relatórios e saúde financeira", async () => {
      for (const path of [
        "/relatorios/categorias",
        "/relatorios/fontes-destinos",
        "/saude-financeira",
      ])
        assert.equal((await req(path, "GET", null, ta)).status, 200);
    });
    await t.test("CRUD de categoria e fonte sem vínculos", async () => {
      for (const [path, dados] of [
        ["/categorias", { nome: "Nova", tipo: "saida" }],
        ["/fontes-destinos", { nome: "Nova", tipo: "conta" }],
      ]) {
        const r = await req(path, "POST", dados, ta);
        assert.equal(r.status, 201);
        assert.equal(
          (
            await req(
              path + "/" + r.data.id,
              "PUT",
              { ...dados, nome: "Editada" },
              ta,
            )
          ).status,
          200,
        );
        assert.equal(
          (await req(path + "/" + r.data.id, "DELETE", null, ta)).status,
          204,
        );
      }
    });
    await t.test("editar parcela e excluir grupo", async () => {
      assert.equal(
        (
          await req(
            "/lancamentos/" + parcelas[0].id,
            "PUT",
            { ...body, valor: "34.00" },
            ta,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await req(
            "/lancamentos/" + parcelas[0].id + "?todasParcelas=true",
            "DELETE",
            null,
            ta,
          )
        ).status,
        204,
      );
      assert.equal(
        (await req("/lancamentos/" + parcelas[1].id, "GET", null, ta)).status,
        404,
      );
    });
    await t.test("totais independentes da página", async () => {
      for (let i = 0; i < 21; i++)
        assert.equal(
          (
            await req(
              "/lancamentos",
              "POST",
              {
                ...body,
                totalParcelas: 1,
                fonteDestinoId: conta.id,
                valor: "1.00",
              },
              ta,
            )
          ).status,
          201,
        );
      const r = await req("/lancamentos", "GET", null, ta);
      assert.equal(r.data.itens.length, 20);
      assert.equal(r.data.totais.quantidade, 21);
      assert.equal(Number(r.data.totais.saidas), 21);
      assert.equal(r.data.paginas, 2);
    });
    await t.test("rollback desfaz operação intermediária", async () => {
      await assert.rejects(
        transacao(async (c) => {
          await c.query(
            "INSERT INTO categorias(usuario_id,nome,tipo) VALUES(1,'Deve sumir','saida')",
          );
          throw Error("falha simulada");
        }),
      );
      assert.equal(
        (await pool.query("SELECT 1 FROM categorias WHERE nome='Deve sumir'"))
          .rowCount,
        0,
      );
    });
    await t.test(
      "banco impede referência de outro usuário sem validação da API",
      async () => {
        await assert.rejects(
          pool.query(
            "INSERT INTO lancamentos(usuario_id,tipo,descricao,valor,data,categoria_id,fonte_destino_id) VALUES(1,$1,$2,1,CURRENT_DATE,$3,$4)",
            [
              "saida",
              "Inválido",
              catsB.find((c) => c.tipo === "saida").id,
              conta.id,
            ],
          ),
          (e) => e.code === "23503",
        );
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
