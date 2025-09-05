import * as ui from "./ui.js";
import * as firestore from "./firestore.js";
import * as state from "./state.js";
import { clearActiveListeners } from "./state.js";

const pageTitles = {
  inicio: "Tela Inicial",
  estoque: "Gerenciar Despensas",
  "lista-de-compras": "Lista de Compras",
  relatorio: "Relatórios",
  usuarios: "Gerenciar Usuários",
  configuracoes: "Configurações",
  ajuda: "Ajuda e FAQ",
};

const templates = {
  inicio: `
        <div id="low-stock-alert-container"></div>
        
        <div id="home-summary-card" class="card">
            <h3>Resumo Geral da Despensa</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <p>Total de Itens</p>
                    <span id="global-total-quantity">Carregando...</span>
                </div>
                <div class="summary-item">
                    <p>Valor Total da Despensa</p>
                    <span id="global-total-value">Carregando...</span>
                </div>
            </div>
        </div>

        <div class="card" id="shopping-list-card">
            <h3>Lista de Compras</h3>
            <div id="shopping-list-container">
                <p>Nenhum item com estoque baixo.</p>
            </div>
        </div>
    `,
  estoque: `
        <div class="card">
            <h3>Criar Nova Despensa</h3>
            <form id="add-inventory-form">
                <input type="text" id="inventory-name" placeholder="Nome da Despensa (ex: Cozinha)" required />
                <button type="submit">Criar Despensa</button>
            </form>
        </div>
        <div class="card">
            <h3>Minhas Despensas</h3>
            <div id="inventory-list"><p>Carregando...</p></div>
        </div>
    `,
  "lista-de-compras": `
        <div class="card">
            <div class="card-header">
                <h3>Itens com Estoque Baixo</h3>
                <button id="print-shopping-list-btn">Imprimir Lista</button>
            </div>
            <div id="shopping-list-page-container">
                 <p>Nenhum item com estoque baixo no momento.</p>
            </div>
        </div>
    `,
  relatorio: `
        <div class="card">
            <h3>Filtros do Relatório</h3>
            <div class="report-filters">
                <div class="form-group">
                    <label for="report-inventory-select">Filtrar por Despensa</label>
                    <select id="report-inventory-select"></select>
                </div>
                <div class="form-group">
                    <label for="report-month-select">Mês</label>
                    <select id="report-month-select">
                        <option value="">Todos</option>
                        <option value="0">Janeiro</option><option value="1">Fevereiro</option><option value="2">Março</option>
                        <option value="3">Abril</option><option value="4">Maio</option><option value="5">Junho</option>
                        <option value="6">Julho</option><option value="7">Agosto</option><option value="8">Setembro</option>
                        <option value="9">Outubro</option><option value="10">Novembro</option><option value="11">Dezembro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="report-year-select">Ano</label>
                    <input type="number" id="report-year-select" placeholder="Ano (ex: 2024)" />
                </div>
                <div class="form-group">
                    <button id="generate-pdf-btn">Gerar PDF</button>
                </div>
            </div>
        </div>
        <div class="card">
            <h3>Movimentações</h3>
            <div id="report-content">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Produto</th>
                            <th>Tipo</th>
                            <th>Detalhes</th>
                            <th>Usuário</th> 
                        </tr>
                    </thead>
                    <tbody id="report-list-body"><tr><td colspan="5">Selecione uma despensa para ver as movimentações.</td></tr></tbody>
                </table>
            </div>
        </div>
    `,
  usuarios: `
        <div class="card">
            <h3>Gerenciar Acesso às Despensas</h3>
            <div class="form-group"><label for="user-inventory-select">Selecione uma Despensa para Gerenciar</label><select id="user-inventory-select"></select></div>
        </div>
        <div id="user-management-content" style="display: none;"><div class="user-management-grid">
            <div class="card">
                <h3>Convidar Novo Usuário</h3>
                <form id="invite-user-form">
                    <div class="form-group"><label for="invite-email">E-mail do Usuário</label><input type="email" id="invite-email" placeholder="email@exemplo.com" required /></div>
                    <button type="submit">Convidar</button>
                </form>
            </div>
            <div class="card">
                <h3>Membros Atuais</h3>
                <div id="user-list"><p>Selecione uma despensa para ver os membros.</p></div>
            </div>
        </div></div>
    `,
  configuracoes: `
        <div class="card">
            <h3>Configurações de Conta</h3>
            <div class="settings-item">
                <form id="change-name-form" class="settings-form">
                    <div class="form-group"><label for="new-display-name">Nome de Exibição</label><input type="text" id="new-display-name" required /></div>
                    <button type="submit" class="small-button">Salvar Nome</button>
                </form>
            </div>
            <div class="settings-item">
                <form id="change-password-form" class="settings-form">
                    <div class="form-group"><label for="current-password">Senha Atual</label><input type="password" id="current-password" required /></div>
                    <div class="form-group"><label for="new-password">Nova Senha</label><input type="password" id="new-password" required /></div>
                    <button type="submit" class="small-button">Alterar Senha</button>
                </form>
            </div>
        </div>
        <div class="card">
            <h3>Configurações de Aparência</h3>
            <div class="settings-item">
                <span>Tema</span>
                <button id="open-theme-modal-btn" class="small-button">Alterar Tema</button>
            </div>
        </div>
    `,
  ajuda: `
<div class="card">
  <h3>Perguntas Frequentes (FAQ)</h3>

  <div class="faq-item">
    <h4>Como eu crio uma nova despensa?</h4>
    <p>Vá para a seção "Minhas Despensas" no menu lateral. No topo da página, encontrará um campo para inserir o nome da sua nova despensa. Digite o nome desejado e clique no botão "Criar Despensa".</p>
  </div>

  <div class="faq-item">
    <h4>Como eu posso renomear ou apagar uma despensa?</h4>
    <p>Na seção "Minhas Despensas", passe o cursor por cima da despensa que deseja alterar. Irão aparecer os botões "Renomear" e "Apagar". Lembre-se que apenas o proprietário da despensa pode realizar estas ações.</p>
  </div>

  <div class="faq-item">
    <h4>Como convido um amigo para a minha despensa?</h4>
    <p>Vá para a seção "Usuários", selecione a despensa desejada na lista, digite o e-mail do seu amigo no campo "Convidar Novo Usuário" e clique em "Convidar". O utilizador precisa de já ter uma conta registada na aplicação.</p>
  </div>

  <div class="faq-item">
    <h4>Como funciona o "Valor Total da Despensa" na Tela inicial?</h4>
    <p>O valor total é calculado multiplicando a quantidade de cada item pelo seu valor unitário e somando todos os resultados. Certifique-se de que os valores dos seus produtos estão atualizados para ter uma estimativa precisa.</p>
  </div>

  <div class="faq-item">
    <h4>Para que serve a "Quantidade Mínima para Alerta"?</h4>
    <p>Este valor define um limite de estoque. Quando a quantidade de um produto for igual ou inferior a este número, um aviso de "Despensa Baixa" será exibido de forma destacada na página "Início" e o item aparecerá na "Lista de Compras", ajudando-o a saber quando precisa de repor os seus itens.</p>
  </div>

  <div class="faq-item">
    <h4>Como gero um relatório em PDF?</h4>
    <p>Vá para a seção "Relatórios", use os filtros para selecionar a despensa (ou todas), o mês e o ano que deseja analisar. As movimentações aparecerão na tabela abaixo. Em seguida, clique no botão "Gerar PDF" para descarregar o ficheiro.</p>
  </div>

  <div class="faq-item">
    <h4>Como posso alterar o tema do aplicativo?</h4>
    <p>Na seção "Configurações", clique no botão "Alterar Tema". Uma janela com as opções de cores disponíveis irá aparecer. Basta selecionar a sua preferida e a alteração será aplicada instantaneamente.</p>
  </div>
</div>
`,
};

export function loadPage(page) {
  clearActiveListeners();

  ui.pageTitle.textContent = pageTitles[page] || "Página";
  ui.contentArea.innerHTML = templates[page];
  ui.menuItems.forEach((item) =>
    item.classList.toggle("active", item.getAttribute("data-page") === page)
  );

  if (page === "inicio") initInicioPage();
  if (page === "estoque") initEstoquePage();
  if (page === "lista-de-compras") initShoppingListPage();
  if (page === "relatorio") initRelatorioPage();
  if (page === "usuarios") initUsuariosPage();
  if (page === "configuracoes") initConfiguracoesPage();
}

// --- Funções de Inicialização de Página ---

function initInicioPage() {
  firestore.checkLowStockAndRender();
  firestore.renderGlobalSummary();
}

function initEstoquePage() {
  firestore.loadInventories();
}

function initConfiguracoesPage() {
  const nameInput = document.getElementById("new-display-name");
  if (nameInput && state.currentUser && state.currentUser.displayName) {
    nameInput.value = state.currentUser.displayName;
  }
}

function initRelatorioPage() {
  firestore.populateInventorySelect("report-inventory-select");
  const yearInput = document.getElementById("report-year-select");
  yearInput.value = new Date().getFullYear();
  const inventoryId = document.getElementById("report-inventory-select").value;
  const month = document.getElementById("report-month-select").value;
  firestore.loadReport(inventoryId, month, yearInput.value);
}

function initUsuariosPage() {
  firestore.populateInventorySelect("user-inventory-select", true);
}

function initShoppingListPage() {
  firestore.renderShoppingListPage();
}