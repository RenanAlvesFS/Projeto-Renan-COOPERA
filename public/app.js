// =====================================================================
// public/app.js — roda no NAVEGADOR. A tela NÃO calcula nada:
// ela coleta os aparelhos, envia ao servidor e desenha a resposta.
//
// Ideia central: os DADOS moram no array "aparelhos".
// A tela é só um desenho do array. Toda mudança segue o ciclo:
//   altera o array  ->  redesenha a lista
// =====================================================================

// ---------- ESTADO E REFERÊNCIAS ----------

// A lista de aparelhos. É "const", mas dá para fazer push:
// o que é constante é a referência ao array, não o conteúdo dele.
const aparelhos = [];

// Buscamos os elementos UMA vez, aqui no topo, e reaproveitamos.
const form = document.querySelector('#form-aparelho');
const lista = document.querySelector('#lista-aparelhos');
const saida = document.querySelector('#resultado');
const erroEl = document.querySelector('#erro');

// ---------- FORMATAÇÃO ----------

// Número -> dinheiro brasileiro. Ex.: 168.27 -> "R$ 168,27"
// Formatar é trabalho da TELA: o servidor manda o número "cru".
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Número -> texto com vírgula e até 2 casas. Ex.: 205.5 -> "205,5"
const n2 = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Helper: cria um elemento já com texto dentro.
// Evita repetir createElement + textContent dezenas de vezes (DRY).
function celula(tag, texto) {
  const el = document.createElement(tag);
  el.textContent = texto; // textContent = texto puro, nunca vira HTML
  return el;
}

// ---------- DESENHAR A LISTA ----------

function desenharLista() {
  // Limpa a lista. Sem isso, cada redesenho DUPLICARIA os itens.
  lista.replaceChildren();

  // Para cada aparelho do array, cria um <li>.
  aparelhos.forEach((a, indice) => {
    const li = document.createElement('li');

    // Texto do item. Usamos textContent e NÃO innerHTML:
    // o nome foi digitado pelo usuário. Se alguém digitar
    // <img src=x onerror=alert(1)> e usarmos innerHTML,
    // o navegador EXECUTA esse código (ataque XSS).
    const texto = document.createElement('span');
    texto.textContent = `${a.nome} ·${a.potenciaW} W ·${a.horasDia} h/dia ·${a.diasMes} dias`;

    // Botão de remover deste item.
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.textContent = 'Remover';

    // A arrow function "lembra" o indice desta volta do forEach
    // (isso se chama closure). Cada botão remove o SEU aparelho.
    remover.addEventListener('click', () => {
      // splice(indice, 1): remove 1 item nessa posição e fecha o buraco.
      // "delete aparelhos[indice]" deixaria um undefined no meio do array.
      aparelhos.splice(indice, 1);
      desenharLista(); // mudou o array -> redesenha
    });

    // Coloca o texto e o botão dentro do <li>, e o <li> dentro da <ul>.
    li.append(texto, remover);
    lista.append(li);
  });
}

// ---------- ADICIONAR PELO FORMULÁRIO ----------

form.addEventListener('submit', (event) => {
  // O comportamento PADRÃO de um form é recarregar a página.
  // Se recarregar, o array zera. preventDefault() impede isso.
  event.preventDefault();

  // .value de um input é SEMPRE texto, mesmo com type="number".
  // Number(...) converte para número. Sem isso, o servidor recusa
  // com 400, porque a validação exige typeof === 'number'.
  aparelhos.push({
    nome: document.querySelector('#nome').value.trim(), // trim tira espaços das pontas
    potenciaW: Number(document.querySelector('#potencia').value),
    horasDia: Number(document.querySelector('#horas').value),
    diasMes: Number(document.querySelector('#dias').value),
  });

  form.reset();                                // limpa os campos
  document.querySelector('#dias').value = 30;  // volta o padrão de 30 dias
  desenharLista();                             // mudou o array -> redesenha
});

// ---------- DESENHAR O RESULTADO ----------

// Recebe o objeto que o servidor devolveu (formato do contrato da API).
function desenharResultado(r) {
  saida.replaceChildren(); // limpa o resultado anterior

  // Bloco de destaque com os números principais.
  const destaque = document.createElement('div');
  destaque.className = 'destaque';
  destaque.append(
    celula('p', `Consumo:${n2(r.consumoKwhMes)} kWh/mês`),
    celula('p', `Conta estimada:${brl(r.totalMes)} (energia${brl(r.custoEnergia)} + bandeira${brl(r.adicionalBandeira)})`),
    celula('p', `Painéis solares necessários:${r.paineisNecessarios}`),
    celula('strong', `Aparelho mais caro:${r.aparelhoMaisCaro.nome} (${brl(r.aparelhoMaisCaro.custo)})`)
  );

  // Tabela de detalhes, montada com createElement.
  const tabela = document.createElement('table');

  // Linha de cabeçalho.
  const cab = document.createElement('tr');
  ['Aparelho', 'kWh/mês', 'Custo', '%'].forEach((t) => cab.append(celula('th', t)));
  tabela.append(cab);

  // Uma linha por aparelho. Repare: NENHUMA conta aqui,
  // só exibimos o que o servidor já calculou.
  r.detalhes.forEach((d) => {
    const tr = document.createElement('tr');
    tr.append(
      celula('td', d.nome),
      celula('td', n2(d.kwhMes)),
      celula('td', brl(d.custo)),
      celula('td', `${n2(d.percentual)}%`)
    );
    tabela.append(tr);
  });

  saida.append(destaque, tabela);
}

// ---------- ENVIAR PARA O SERVIDOR ----------

// async: a função pode usar await. A requisição demora, e o await
// pausa SÓ esta função até a resposta chegar, sem travar a página.
document.querySelector('#btn-simular').addEventListener('click', async () => {
  erroEl.hidden = true; // esconde um erro antigo, se houver

  try {
    // URL relativa: a página e a API estão no mesmo servidor (localhost:3000).
    const resposta = await fetch('/api/simular', {
      method: 'POST',
      // Avisa o servidor que o corpo é JSON. É este cabeçalho que o
      // express.json() procura. Sem ele, req.body.aparelhos chega undefined.
      headers: { 'Content-Type': 'application/json' },
      // HTTP só transporta texto: JSON.stringify transforma o objeto em texto.
      // A chave precisa se chamar "aparelhos" (contrato da API).
      body: JSON.stringify({ aparelhos }),
    });

    // Lê o corpo da resposta e transforma de volta em objeto.
    const dados = await resposta.json();

    // ATENÇÃO: o fetch NÃO dá erro quando o servidor responde 400.
    // Ele só cai no catch se a rede falhar. Por isso testamos resposta.ok
    // (true para status 200 a 299).
    if (!resposta.ok) {
      erroEl.textContent = dados.erro; // mensagem que o servidor mandou
      erroEl.hidden = false;
      return;
    }

    // Deu certo: desenha o resultado.
    desenharResultado(dados);
  } catch (e) {
    // Chega aqui se o servidor estiver desligado ou a rede falhar.
    erroEl.textContent = 'Não foi possível falar com o servidor. Ele está rodando?';
    erroEl.hidden = false;
  }
});