// =====================================================================
// calculos.js — as REGRAS DE NEGÓCIO da Coopera Luz.
// Regra de ouro deste arquivo: só funções "puras".
// Função pura = recebe dados, devolve um resultado e NÃO mexe em tela,
// em req/res nem em variáveis de fora. Assim dá para testar cada conta
// no terminal, sem servidor e sem navegador.
// =====================================================================

// Importa o objeto de configuração (tarifa, bandeira, painel...).
const cfg = require('./config');

// O painel é dimensionado com um mês "padrão" de 30 dias.
const DIAS_REFERENCIA = 30;

// Arredonda para 2 casas decimais. Ex.: 3.873675 -> 3.87
// Por que multiplicar e dividir por 100? Math.round só arredonda para
// inteiro; então "andamos" a vírgula 2 casas, arredondamos e voltamos.
// IMPORTANTE: só usamos isso NO FINAL, na resposta. Arredondar no meio
// das contas acumula erro de centavos.
const arred = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------
// 1) Consumo de UM aparelho no mês, em kWh.
//    W × horas = Wh (watt-hora). Dividir por 1000 transforma em kWh,
//    que é a unidade que aparece na conta de luz.
//    Ex.: geladeira 150 W × 24 h × 30 dias = 108.000 Wh = 108 kWh
// ---------------------------------------------------------------------
function consumoMensalKwh(aparelho) {
  return (aparelho.potenciaW * aparelho.horasDia * aparelho.diasMes) / 1000;
}

// ---------------------------------------------------------------------
// 2) Custo da energia (sem bandeira): kWh × preço do kWh.
// ---------------------------------------------------------------------
function custoEnergia(kwh) {
  return kwh * cfg.TARIFA_KWH;
}

// ---------------------------------------------------------------------
// 3) Adicional da bandeira. A bandeira é cobrada "a cada 100 kWh",
//    por isso dividimos o consumo por 100.
//    cfg.VALORES_BANDEIRA[cfg.BANDEIRA] usa COLCHETES porque o nome
//    da chave está dentro de uma variável (ex.: 'amarela').
//    Com ponto (VALORES_BANDEIRA.BANDEIRA) o JS procuraria uma chave
//    chamada literalmente "BANDEIRA", que não existe -> undefined.
// ---------------------------------------------------------------------
function adicionalBandeira(kwh) {
  return (kwh / 100) * cfg.VALORES_BANDEIRA[cfg.BANDEIRA];
}

// ---------------------------------------------------------------------
// 4) Quanto 1 painel gera por mês, em kWh.
//    (W ÷ 1000 = kW) × horas de sol por dia × 30 dias × eficiência
//    Caso oficial: 0,45 × 4,5 × 30 × 0,8 = 48,6 kWh/mês
// ---------------------------------------------------------------------
function geracaoPorPainelKwh() {
  return (cfg.POTENCIA_PAINEL_W / 1000) * cfg.HSP * DIAS_REFERENCIA * cfg.EFICIENCIA;
}

// ---------------------------------------------------------------------
// 5) Quantos painéis a casa precisa.
//    Math.ceil arredonda SEMPRE para cima: 4,23 vira 5.
//    Não dá para comprar 0,23 painel, e com 4 faltaria energia.
//    (Math.round daria 4 e Math.floor também: os dois estão errados aqui.)
// ---------------------------------------------------------------------
function paineisNecessarios(kwh) {
  return Math.ceil(kwh / geracaoPorPainelKwh());
}

// ---------------------------------------------------------------------
// 6) simular — junta tudo e monta o objeto no formato do CONTRATO DA API.
//    O front-end depende exatamente destes nomes de campo.
// ---------------------------------------------------------------------
function simular(aparelhos) {
  // map: para cada aparelho da lista, cria um item com consumo e custo.
  // Entra uma lista de N aparelhos, sai uma lista de N itens.
  const itens = aparelhos.map((a) => {
    const kwh = consumoMensalKwh(a);
    return { nome: a.nome.trim(), kwh, custo: custoEnergia(kwh) };
  });

  // reduce: percorre a lista acumulando a soma. O 0 é o valor inicial.
  const total = itens.reduce((soma, i) => soma + i.kwh, 0);

  // Custos da conta inteira, ainda SEM arredondar.
  const energia = custoEnergia(total);
  const bandeira = adicionalBandeira(total);

  // Outro reduce: guarda "o maior até agora". Começa no primeiro item
  // e troca sempre que encontrar um com custo maior.
  const maisCaro = itens.reduce((max, i) => (i.custo > max.custo ? i : max), itens[0]);

  // Agora sim arredondamos, só na saída.
  return {
    consumoKwhMes: arred(total),
    custoEnergia: arred(energia),
    adicionalBandeira: arred(bandeira),
    totalMes: arred(energia + bandeira),
    // total > 0 evita dividir por zero se todos os aparelhos tiverem 0 h/dia.
    paineisNecessarios: total > 0 ? paineisNecessarios(total) : 0,
    aparelhoMaisCaro: { nome: maisCaro.nome, custo: arred(maisCaro.custo) },
    detalhes: itens.map((i) => ({
      nome: i.nome,
      kwhMes: arred(i.kwh),
      custo: arred(i.custo),
      // Percentual = parte ÷ todo × 100.
      percentual: total > 0 ? arred((i.kwh / total) * 100) : 0,
    })),
  };
}

// ---------------------------------------------------------------------
// 7) validar — confere os dados ANTES de calcular.
//    Devolve o texto do PRIMEIRO erro encontrado, ou null se está tudo certo.
//    Por que validar no servidor se o HTML já tem min/max?
//    Porque qualquer pessoa apaga o min/max no DevTools ou manda a
//    requisição direto pelo Thunder Client. O servidor nunca confia
//    no navegador.
// ---------------------------------------------------------------------
function validar(aparelhos) {
  // Precisa ser uma lista (array) e não pode estar vazia.
  if (!Array.isArray(aparelhos) || aparelhos.length === 0) {
    return 'Envie ao menos um aparelho na lista "aparelhos"';
  }

  // Número de verdade: tipo number E finito (barra "150", NaN e Infinity).
  // Por que barrar "150" (texto)? Porque "150" + 24 vira "15024" no JS.
  const ehNumero = (v) => typeof v === 'number' && Number.isFinite(v);

  for (let i = 0; i < aparelhos.length; i++) {
    // "|| {}" evita erro se vier null no lugar de um aparelho.
    const a = aparelhos[i] || {};
    // Mostra a posição para quem usa a API saber qual aparelho está errado.
    const pos = `(aparelho${i + 1})`;

    if (typeof a.nome !== 'string' || a.nome.trim() === '') return `nome é obrigatório${pos}`;
    if (!ehNumero(a.potenciaW) || a.potenciaW < 1 || a.potenciaW > 10000) return `potenciaW deve estar entre 1 e 10000${pos}`;
    if (!ehNumero(a.horasDia) || a.horasDia < 0 || a.horasDia > 24) return `horasDia deve estar entre 0 e 24${pos}`;
    // Dias precisam ser inteiros: não existe "30,5 dias" num mês.
    if (!Number.isInteger(a.diasMes) || a.diasMes < 1 || a.diasMes > 31) return `diasMes deve ser inteiro entre 1 e 31${pos}`;
  }

  // Nenhum erro encontrado.
  return null;
}

// Exporta as funções para o server.js (e para os testes) poderem usar.
module.exports = { consumoMensalKwh, custoEnergia, adicionalBandeira, paineisNecessarios, simular, validar };