// =====================================================================
// config.js — TODOS os números que podem mudar ficam aqui.
// Por quê? Tarifa e bandeira mudam todo mês. Se esses valores estivessem
// espalhados pelo código, você teria que caçar cada um. Aqui você troca
// numa linha só e o sistema inteiro passa a usar o novo valor.
// =====================================================================

// module.exports é o jeito do Node de "exportar" este objeto.
// Outro arquivo consegue usá-lo com: const cfg = require('./config');
module.exports = {
  // Preço de 1 kWh em reais. (Valor do CASO OFICIAL; troque pelo seu no Passo 5.)
  TARIFA_KWH: 0.80,

  // Bandeira tarifária do mês. Precisa ser uma das chaves de VALORES_BANDEIRA.
  BANDEIRA: 'amarela',

  // HSP = horas de sol pleno por dia. Usado para saber quanto um painel gera.
  HSP: 4.5,

  // Potência de UM painel solar, em watts.
  POTENCIA_PAINEL_W: 450,

  // Um sistema solar perde energia no cabo, no calor e no inversor.
  // 0.80 significa que só 80% do que o painel produz chega na casa.
  EFICIENCIA: 0.80,

  // Quanto cada bandeira acrescenta na conta, em R$ a cada 100 kWh.
  VALORES_BANDEIRA: { verde: 0, amarela: 1.885, vermelha1: 4.463, vermelha2: 7.877 },
};

// Meus parâmetros pessoais (gerados na página da atividade):
// TARIFA_KWH: ___   BANDEIRA: ___   HSP: ___   POTENCIA_PAINEL_W: ___