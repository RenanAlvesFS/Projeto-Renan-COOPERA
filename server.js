// =====================================================================
// server.js — o servidor web. Ele só RECEBE, VALIDA e REPASSA.
// Quem calcula é o calculos.js. Rota curta = fácil de ler e de testar.
// =====================================================================

// Importa o Express (instalado com: npm install express).
const express = require('express');

// Importa só as duas funções que a rota usa (desestruturação).
const { simular, validar } = require('./calculos');

// Cria a aplicação (o "servidor").
const app = express();

// MIDDLEWARE 1: lê o corpo das requisições com Content-Type: application/json
// e transforma o texto JSON em objeto dentro de req.body.
// Sem esta linha, req.body chega undefined.
app.use(express.json());

// MIDDLEWARE 2: entrega os arquivos da pasta public (HTML, CSS, JS da tela).
// É por isso que http://localhost:3000 abre o index.html sem criar rota.
app.use(express.static('public'));

// ROTA DA API.
// POST porque estamos ENVIANDO uma lista de dados no corpo.
// (GET serve para buscar e não tem corpo.)
// O prefixo /api/ separa "rotas que devolvem dados" de "arquivos da página".
app.post('/api/simular', (req, res) => {
  // 1) Pega a lista. "req.body &&" evita erro se o corpo não existir.
  const aparelhos = req.body && req.body.aparelhos;

  // 2) Valida. Se tiver erro, responde 400 (= "o cliente mandou dado errado").
  //    O RETURN é obrigatório: sem ele o código continua, tenta responder
  //    de novo e o Express quebra com "Cannot set headers after they are sent".
  const erro = validar(aparelhos);
  if (erro) return res.status(400).json({ erro });

  // 3) Tudo certo: calcula e responde 200 com o JSON do resultado.
  res.json(simular(aparelhos));
});

// TRATAMENTO DE JSON MALFORMADO.
// Se alguém mandar um corpo quebrado (ex.: "{oops"), o express.json()
// gera um erro. Este middleware (4 parâmetros = middleware de erro)
// transforma isso num 400 com mensagem legível em vez de uma página de erro.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }
  next(err); // qualquer outro erro segue o fluxo normal do Express
});

// Liga o servidor na porta 3000.
// O "if" só liga quando você roda "node server.js" diretamente;
// assim os testes conseguem importar o app sem abrir a porta.
if (require.main === module) {
  app.listen(3000, () => console.log('Medidor Coopera em http://localhost:3000'));
}

module.exports = app;