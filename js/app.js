// =========================================================
// Autoeletric - funcionamento do site
// Os dados ficam no localStorage do navegador (não há servidor).
// Cada página tem <body data-pagina="..."> e, no final deste
// arquivo, rodamos só a função daquela página.
// =========================================================

// ---------- Funções de apoio ----------
function ler(chave, padrao) {
  const texto = localStorage.getItem(chave);
  return texto ? JSON.parse(texto) : padrao;
}

function salvar(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

function moeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function acharProduto(id) {
  return PRODUTOS.find(p => p.id === Number(id));
}

function acharCategoria(id) {
  return CATEGORIAS.find(c => c.id === id);
}

// Lê um valor do endereço da página. Ex.: produto.html?id=3 -> parametro("id") = "3"
function parametro(nome) {
  return new URLSearchParams(location.search).get(nome);
}

// ---------- Modo claro / escuro ----------
// O Bootstrap e o nosso CSS mudam as cores pelo atributo <html data-bs-theme="dark">
function aplicarTema(tema) {
  document.documentElement.dataset.bsTheme = tema;
  salvar("ae_tema", tema);
  document.getElementById("botaoTema").textContent = tema === "dark" ? "☀️ Modo claro" : "🌙 Modo escuro";
}

function trocarTema() {
  aplicarTema(document.documentElement.dataset.bsTheme === "dark" ? "light" : "dark");
}

// ---------- Estoque ----------
// Começa com o valor do dados.js e diminui a cada compra
function estoque(produto) {
  const salvo = ler("ae_estoque", {});
  return salvo[produto.id] !== undefined ? salvo[produto.id] : produto.estoque;
}

function baixarEstoque(produto, quantidade) {
  const salvo = ler("ae_estoque", {});
  salvo[produto.id] = estoque(produto) - quantidade;
  salvar("ae_estoque", salvo);
}

// ---------- Carrinho ----------
function lerCarrinho() {
  return ler("ae_carrinho", []);
}

function atualizarContador() {
  let total = 0;
  lerCarrinho().forEach(item => total += item.qtd);
  document.querySelectorAll(".contador-carrinho").forEach(contador => {
    contador.textContent = total;
    contador.hidden = total === 0;
  });
}

function adicionarAoCarrinho(id) {
  const produto = acharProduto(id);
  const carrinho = lerCarrinho();
  const item = carrinho.find(i => i.id === produto.id);
  const jaNoCarrinho = item ? item.qtd : 0;
  if (jaNoCarrinho + 1 > estoque(produto)) {
    avisar("Quantidade indisponível em estoque para " + produto.nome + ".", "warning");
    return;
  }
  if (item) {
    item.qtd++;
  } else {
    carrinho.push({ id: produto.id, qtd: 1 });
  }
  salvar("ae_carrinho", carrinho);
  atualizarContador();
  avisar(produto.nome + " foi adicionado ao carrinho.", "success");
}

// Mensagem rápida no canto da tela, que some depois de 3 segundos
function avisar(mensagem, tipo) {
  let area = document.getElementById("areaAvisos");
  if (!area) {
    area = document.createElement("div");
    area.id = "areaAvisos";
    document.body.appendChild(area);
  }
  const aviso = document.createElement("div");
  aviso.className = "aviso aviso-" + tipo;
  aviso.textContent = mensagem;
  area.appendChild(aviso);
  setTimeout(() => aviso.remove(), 3000);
}

// ---------- Conta do cliente ----------
function clienteLogado() {
  const email = ler("ae_sessao", null);
  return ler("ae_clientes", []).find(c => c.email === email);
}

// Mostra "Olá, nome" e o link Sair no menu quando há alguém logado
function mostrarSessao() {
  const cliente = clienteLogado();
  if (!cliente) return;
  const area = document.getElementById("navSessao");
  area.innerHTML = '<span class="nav-ola"></span><a class="nav-sair" href="index.html" onclick="sair()">Sair</a>';
  area.querySelector(".nav-ola").textContent = "Olá, " + cliente.nome.split(" ")[0];
}

function sair() {
  localStorage.removeItem("ae_sessao");
}

// Codifica a senha em Base64 para ela não ficar legível (é só um exemplo, não é criptografia)
function codificar(senha) {
  return btoa(unescape(encodeURIComponent(senha)));
}

// Depois do login/cadastro, volta para o carrinho (se veio de lá) ou vai para Meus pedidos
function proximaPagina() {
  return parametro("next") === "carrinho.html" ? "carrinho.html" : "pedidos.html";
}

// ---------- Cartão de produto (Veículos e Acessórios) ----------
function cartaoProduto(p) {
  const qtd = estoque(p);
  const resumo = p.descricao.split(". ")[0];   // só a primeira frase
  let selo = "";
  if (qtd === 0) {
    selo = '<span class="selo selo-esgotado">Esgotado</span>';
  } else if (qtd <= 4) {
    selo = `<span class="selo">Últimas ${qtd} unidades</span>`;
  }
  return `
    <div class="col">
      <article class="card cartao-produto h-100">
        <a class="cartao-imagem" href="produto.html?id=${p.id}">
          <img class="card-img-top" src="${p.imagem}" alt="${p.nome}">${selo}
        </a>
        <div class="card-body d-flex flex-column">
          <small class="cartao-categoria">${acharCategoria(p.categoria).nome}</small>
          <h3 class="card-title h5">${p.nome}</h3>
          <p class="card-text flex-grow-1">${resumo.endsWith(".") ? resumo : resumo + "."}</p>
          <p class="preco">${moeda(p.preco)}</p>
          <div class="d-flex gap-2">
            <a class="btn btn-outline-dark btn-sm flex-fill" href="produto.html?id=${p.id}">Detalhes</a>
            <button class="btn btn-lima btn-sm flex-fill" onclick="adicionarAoCarrinho(${p.id})" ${qtd === 0 ? "disabled" : ""}>
              ${qtd === 0 ? "Indisponível" : "Adicionar"}
            </button>
          </div>
        </div>
      </article>
    </div>`;
}

// ---------- Página inicial ----------
function iniciarHome() {
  const destaque = acharProduto(8);
  document.getElementById("destaquePrincipal").innerHTML = `
    <img src="img/hero.jpg" alt="${destaque.nome}">
    <div class="destaque-texto">
      <span class="etiqueta">Destaque da semana</span>
      <h2>${destaque.nome}</h2>
      <p>${destaque.descricao}</p>
      <a class="btn btn-lima btn-lg" href="produto.html?id=${destaque.id}">Ver por ${moeda(destaque.preco)}</a>
    </div>`;

  // map() transforma cada item em um pedaço de HTML e join("") junta tudo
  document.getElementById("destaquesLaterais").innerHTML = [5, 6, 1].map((id, i) => {
    const p = acharProduto(id);
    return `
      <a class="destaque-lateral" href="produto.html?id=${p.id}">
        <span class="numero">${i + 1}</span>
        <img src="${p.imagem}" alt="${p.nome}">
        <div><strong>${p.nome}</strong><small>${moeda(p.preco)}</small></div>
      </a>`;
  }).join("");

  document.getElementById("gradeCategorias").innerHTML = CATEGORIAS.filter(c => c.tipo === "veiculo").map(c => {
    const primeiro = PRODUTOS.find(p => p.categoria === c.id);
    return `
      <a class="categoria-card" href="catalogo.html?categoria=${c.id}">
        <img src="${primeiro.imagem}" alt="${c.nome}">
        <div><h3>${c.nome}</h3><p>${c.descricao}</p></div>
      </a>`;
  }).join("");

  document.getElementById("listaNovidades").innerHTML = NOVIDADES.map(n => `
    <li><time>${n.data}</time><div><strong>${n.titulo}</strong><p>${n.texto}</p></div></li>`).join("");
}

// ---------- Veículos e Acessórios: busca, filtro e ordenação ----------
function iniciarCatalogo(tipo) {
  const busca = document.getElementById("filtroBusca");
  const categoria = document.getElementById("filtroCategoria");
  const ordem = document.getElementById("filtroOrdem");

  // Coloca no select só as categorias deste tipo (veiculo ou acessorio)
  CATEGORIAS.filter(c => c.tipo === tipo).forEach(c => {
    categoria.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
  categoria.value = parametro("categoria") || "todas";

  function desenhar() {
    const termo = busca.value.trim().toLowerCase();
    const lista = PRODUTOS.filter(p =>
      acharCategoria(p.categoria).tipo === tipo &&
      (categoria.value === "todas" || p.categoria === categoria.value) &&
      (p.nome.toLowerCase().includes(termo) || p.descricao.toLowerCase().includes(termo))
    );

    if (ordem.value === "menor") {
      lista.sort((a, b) => a.preco - b.preco);
    } else if (ordem.value === "maior") {
      lista.sort((a, b) => b.preco - a.preco);
    } else {
      lista.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    document.getElementById("contagemResultados").textContent =
      lista.length + (lista.length === 1 ? " produto encontrado" : " produtos encontrados");
    document.getElementById("listaProdutos").innerHTML = lista.length > 0
      ? lista.map(cartaoProduto).join("")
      : '<div class="col-12"><div class="alert alert-secondary">Nenhum produto corresponde à sua busca.</div></div>';
  }

  busca.addEventListener("input", desenhar);
  categoria.addEventListener("change", desenhar);
  ordem.addEventListener("change", desenhar);
  desenhar();
}

// ---------- Página do produto (produto.html?id=...) ----------
function iniciarProduto() {
  const p = acharProduto(parametro("id"));
  const alvo = document.getElementById("detalheProduto");
  if (!p) {
    alvo.innerHTML = '<div class="alert alert-warning">Produto não encontrado. <a class="alert-link" href="catalogo.html">Voltar ao catálogo</a>.</div>';
    return;
  }
  document.title = p.nome + " | Autoeletric";
  const qtd = estoque(p);
  const categoria = acharCategoria(p.categoria);
  const paginaVoltar = categoria.tipo === "veiculo" ? "catalogo.html" : "acessorios.html";
  const ficha = Object.keys(p.specs).map(chave => `<tr><th>${chave}</th><td>${p.specs[chave]}</td></tr>`).join("");

  alvo.innerHTML = `
    <div class="row g-4 g-lg-5 align-items-start">
      <div class="col-lg-6">
        <img class="detalhe-imagem" src="${p.imagem}" alt="${p.nome}">
      </div>
      <div class="col-lg-6">
        <a class="voltar" href="${paginaVoltar}?categoria=${p.categoria}">&larr; ${categoria.nome}</a>
        <h1>${p.nome}</h1>
        <p class="lead">${p.descricao}</p>
        <p class="preco preco-grande">${moeda(p.preco)}</p>
        <p class="${qtd === 0 ? "estoque-sem" : "estoque-com"}">
          ${qtd === 0 ? "Esgotado no momento" : qtd + " unidades disponíveis para retirada em Curitiba"}
        </p>
        <button class="btn btn-lima btn-lg" onclick="adicionarAoCarrinho(${p.id})" ${qtd === 0 ? "disabled" : ""}>Adicionar ao carrinho</button>
        <h2 class="h5 mt-4">Ficha técnica</h2>
        <table class="table table-sm tabela-specs">${ficha}</table>
      </div>
    </div>`;
}

// ---------- Carrinho ----------
function desenharCarrinho() {
  const carrinho = lerCarrinho();
  document.getElementById("carrinhoVazio").hidden = carrinho.length > 0;
  document.getElementById("carrinhoConteudo").hidden = carrinho.length === 0;

  let total = 0;
  document.getElementById("itensCarrinho").innerHTML = carrinho.map(item => {
    const p = acharProduto(item.id);
    total += p.preco * item.qtd;
    return `
      <tr>
        <td>
          <div class="item-carrinho">
            <img src="${p.imagem}" alt="">
            <div><strong>${p.nome}</strong><small>${moeda(p.preco)} cada</small></div>
          </div>
        </td>
        <td>
          <div class="input-group input-group-sm quantidade">
            <button class="btn btn-outline-dark" onclick="mudarQuantidade(${p.id}, -1)" aria-label="Diminuir">&minus;</button>
            <input class="form-control text-center" value="${item.qtd}" readonly aria-label="Quantidade">
            <button class="btn btn-outline-dark" onclick="mudarQuantidade(${p.id}, 1)" aria-label="Aumentar">+</button>
          </div>
        </td>
        <td class="text-end fw-bold">${moeda(p.preco * item.qtd)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-link text-danger" onclick="mudarQuantidade(${p.id}, -${item.qtd})">Remover</button>
        </td>
      </tr>`;
  }).join("");
  document.getElementById("resumoCarrinho").textContent = moeda(total);
}

function mudarQuantidade(id, mudanca) {
  const carrinho = lerCarrinho();
  const item = carrinho.find(i => i.id === id);
  const limite = estoque(acharProduto(id));
  item.qtd += mudanca;
  if (item.qtd > limite) {
    item.qtd = limite;
    avisar("Limite de estoque atingido.", "warning");
  }
  salvar("ae_carrinho", carrinho.filter(i => i.qtd > 0));   // tira quem ficou com 0
  atualizarContador();
  desenharCarrinho();
}

// Botão "Finalizar compra": exige login e abre a janela de resumo
function abrirResumo() {
  const cliente = clienteLogado();
  if (!cliente) {
    location.href = "login.html?next=carrinho.html";
    return;
  }
  let total = 0;
  document.getElementById("modalItens").innerHTML = lerCarrinho().map(item => {
    const p = acharProduto(item.id);
    total += p.preco * item.qtd;
    return `<li class="list-group-item d-flex justify-content-between"><span>${item.qtd}× ${p.nome}</span><strong>${moeda(p.preco * item.qtd)}</strong></li>`;
  }).join("");
  document.getElementById("modalCliente").textContent = cliente.nome + " — CPF " + cliente.cpf;
  document.getElementById("modalTotal").textContent = moeda(total);
  bootstrap.Modal.getOrCreateInstance("#modalResumo").show();
}

// Botão "Confirmar pedido": confere o estoque, grava o pedido e baixa o estoque
function confirmarPedido(evento) {
  evento.preventDefault();
  const carrinho = lerCarrinho();
  for (const item of carrinho) {
    const p = acharProduto(item.id);
    if (item.qtd > estoque(p)) {
      avisar("Estoque insuficiente para " + p.nome + ".", "warning");
      return;
    }
  }

  const pedidos = ler("ae_pedidos", []);
  const numero = 1001 + pedidos.length;
  let total = 0;
  const itens = carrinho.map(item => {
    const p = acharProduto(item.id);
    baixarEstoque(p, item.qtd);
    total += p.preco * item.qtd;
    return { id: p.id, nome: p.nome, qtd: item.qtd, preco: p.preco };
  });

  pedidos.push({
    numero: numero,
    email: clienteLogado().email,
    itens: itens,
    total: total,
    pagamento: document.getElementById("formaPagamento").value,
    status: 0,
    criado: new Date().toISOString()
  });
  salvar("ae_pedidos", pedidos);
  salvar("ae_carrinho", []);
  location.href = "pedidos.html?novo=" + numero;
}

// ---------- Cadastro ----------
function iniciarCadastro() {
  // Data de nascimento máxima = hoje menos 18 anos (o navegador bloqueia datas depois disso)
  const hoje = new Date();
  const limite = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
  document.getElementById("nascimento").max = limite.toISOString().slice(0, 10);
}

function conferirSenhas() {
  const confirma = document.getElementById("confirmaSenha");
  const iguais = confirma.value === document.getElementById("senha").value;
  confirma.setCustomValidity(iguais ? "" : "As senhas não coincidem.");
}

function cadastrar(evento) {
  evento.preventDefault();
  const form = evento.target;
  conferirSenhas();
  form.classList.add("was-validated");   // o Bootstrap mostra os erros em vermelho
  if (!form.checkValidity()) return;

  const clientes = ler("ae_clientes", []);
  const email = document.getElementById("email").value.trim().toLowerCase();
  if (clientes.some(c => c.email === email)) {
    document.getElementById("alertaCadastro").innerHTML = '<div class="alert alert-danger">Este e-mail já está cadastrado. <a class="alert-link" href="login.html">Entrar</a></div>';
    return;
  }
  clientes.push({
    id: clientes.length + 1,
    nome: document.getElementById("nome").value.trim(),
    cpf: document.getElementById("cpf").value,
    email: email,
    telefone: document.getElementById("telefone").value,
    nascimento: document.getElementById("nascimento").value,
    senha_hash: codificar(document.getElementById("senha").value),
    data_cadastro: new Date().toISOString()
  });
  salvar("ae_clientes", clientes);
  salvar("ae_sessao", email);
  location.href = proximaPagina();
}

// ---------- Login ----------
function iniciarLogin() {
  // Se veio do carrinho, o link "Criar conta" também leva o ?next=
  document.getElementById("linkCadastro").href = "cadastro.html" + location.search;
}

function entrar(evento) {
  evento.preventDefault();
  const form = evento.target;
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;

  const email = document.getElementById("emailLogin").value.trim().toLowerCase();
  const senha = codificar(document.getElementById("senhaLogin").value);
  const cliente = ler("ae_clientes", []).find(c => c.email === email && c.senha_hash === senha);
  if (!cliente) {
    document.getElementById("alertaLogin").innerHTML = '<div class="alert alert-danger">E-mail ou senha incorretos.</div>';
    return;
  }
  salvar("ae_sessao", email);
  location.href = proximaPagina();
}

// ---------- Meus pedidos ----------
function iniciarPedidos() {
  const alvo = document.getElementById("listaPedidos");
  const cliente = clienteLogado();
  if (!cliente) {
    alvo.innerHTML = '<div class="alert alert-info">Entre na sua conta para consultar seus pedidos. <a class="alert-link" href="login.html?next=pedidos.html">Entrar</a> ou <a class="alert-link" href="cadastro.html?next=pedidos.html">cadastre-se</a>.</div>';
    return;
  }
  if (parametro("novo")) {
    document.getElementById("alertaNovo").innerHTML = `<div class="alert alert-success">Pedido #${Number(parametro("novo"))} registrado! Retire na loja física em Curitiba após o status "Aguardando retirada".</div>`;
  }

  const meus = ler("ae_pedidos", []).filter(p => p.email === cliente.email).reverse();
  if (meus.length === 0) {
    alvo.innerHTML = '<div class="alert alert-secondary">Você ainda não fez pedidos. <a class="alert-link" href="catalogo.html">Explore o catálogo</a>.</div>';
    return;
  }

  alvo.innerHTML = meus.map(pedido => {
    const concluido = pedido.status === STATUS_PEDIDO.length - 1;
    // Etapas antes do status atual ficam "feito"; a etapa atual fica destacada
    const etapas = STATUS_PEDIDO.map((nome, i) => {
      let classe = "";
      if (i < pedido.status) classe = "feito";
      if (i === pedido.status) classe = "atual";
      return `<li class="${classe}">${nome}</li>`;
    }).join("");
    const itens = pedido.itens.map(item => `<li>${item.qtd}× ${item.nome}</li>`).join("");
    return `
      <article class="card pedido-card mb-3">
        <div class="card-body">
          <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
            <h3 class="h5 mb-0">Pedido #${pedido.numero}</h3>
            <span class="badge ${concluido ? "text-bg-dark" : "badge-lima"}">${STATUS_PEDIDO[pedido.status]}</span>
          </div>
          <ol class="linha-status">${etapas}</ol>
          <ul class="itens-pedido">${itens}</ul>
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>${pedido.pagamento} · ${new Date(pedido.criado).toLocaleDateString("pt-BR")} · <strong>${moeda(pedido.total)}</strong></span>
            <button class="btn btn-outline-dark btn-sm" onclick="avancarStatus(${pedido.numero})" ${concluido ? "disabled" : ""}>
              ${concluido ? "Concluído" : "Avançar status (simulação)"}
            </button>
          </div>
        </div>
      </article>`;
  }).join("");
}

function avancarStatus(numero) {
  const pedidos = ler("ae_pedidos", []);
  pedidos.find(p => p.numero === numero).status++;
  salvar("ae_pedidos", pedidos);
  iniciarPedidos();
}

// ---------- Contato ----------
function enviarContato(evento) {
  evento.preventDefault();
  const form = evento.target;
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;

  const mensagens = ler("ae_mensagens", []);
  mensagens.push({
    nome: document.getElementById("contatoNome").value,
    email: document.getElementById("contatoEmail").value,
    assunto: document.getElementById("contatoAssunto").value,
    mensagem: document.getElementById("contatoMensagem").value,
    data: new Date().toISOString()
  });
  salvar("ae_mensagens", mensagens);
  form.reset();
  form.classList.remove("was-validated");
  document.getElementById("alertaContato").innerHTML = '<div class="alert alert-success">Mensagem enviada! Responderemos pelo e-mail informado.</div>';
}

// ---------- Regras: filtra a tabela pelos botões ----------
function filtrarRegras(tipo, botao) {
  document.querySelectorAll(".filtros-regra .btn").forEach(b => b.classList.remove("active"));
  botao.classList.add("active");
  document.querySelectorAll("#tabelaRegras tbody tr").forEach(linha => {
    linha.hidden = tipo !== "todos" && linha.dataset.tipo !== tipo;
  });
}

// ---------- Executa em todas as páginas ----------
aplicarTema(ler("ae_tema", "light"));
atualizarContador();
mostrarSessao();
document.querySelectorAll(".ano-atual").forEach(ano => ano.textContent = new Date().getFullYear());

const paginas = {
  home: iniciarHome,
  catalogo: () => iniciarCatalogo("veiculo"),
  acessorios: () => iniciarCatalogo("acessorio"),
  produto: iniciarProduto,
  carrinho: desenharCarrinho,
  cadastro: iniciarCadastro,
  login: iniciarLogin,
  pedidos: iniciarPedidos
};
const iniciarPagina = paginas[document.body.dataset.pagina];
if (iniciarPagina) iniciarPagina();
