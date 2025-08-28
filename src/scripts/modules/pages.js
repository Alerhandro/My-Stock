import * as ui from './ui.js';
import * as firestore from './firestore.js';
import * as state from './state.js'; 
import { clearActiveListeners } from './state.js';

const pageTitles = {
    inicio: "Dashboard",
    estoque: "Gerenciar Estoques",
    relatorio: "Relatórios",
    usuarios: "Gerenciar Usuários",
    configuracoes: "Configurações",
    ajuda: "Ajuda e FAQ",
};

const templates = {
    inicio: `
        <div id="low-stock-alert-container"></div>
        <div id="home-summary-card" class="card">
            <h3>Resumo Geral do Estoque</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <p>Quantidade Total de Itens</p>
                    <span id="global-total-quantity">Carregando...</span>
                </div>
                <div class="summary-item">
                    <p>Valor Total do Estoque</p>
                    <span id="global-total-value">Carregando...</span>
                </div>
            </div>
        </div>
    `,
    estoque: `
        <div class="card">
            <h3>Criar Novo Estoque</h3>
            <form id="add-inventory-form">
                <input type="text" id="inventory-name" placeholder="Nome do Estoque (ex: Cozinha)" required />
                <button type="submit">Criar Estoque</button>
            </form>
        </div>
        <div class="card">
            <h3>Meus Estoques</h3>
            <div id="inventory-list"><p>Carregando...</p></div>
        </div>
    `,
    relatorio: `
        <div class="card">
            <h3>Filtros do Relatório</h3>
            <div class="report-filters">
                <div class="form-group">
                    <label for="report-inventory-select">Filtrar por Estoque</label>
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
                    <tbody id="report-list-body"><tr><td colspan="5">Selecione um estoque para ver as movimentações.</td></tr></tbody>
                </table>
            </div>
        </div>
    `,
    usuarios: `
        <div class="card">
            <h3>Gerenciar Acesso aos Estoques</h3>
            <div class="form-group"><label for="user-inventory-select">Selecione um Estoque para Gerenciar</label><select id="user-inventory-select"></select></div>
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
                <div id="user-list"><p>Selecione um estoque para ver os membros.</p></div>
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
        <h4>Como convido um amigo para o meu estoque?</h4>
        <p>Vá para a seção "Usuários", selecione o estoque desejado na lista, digite o e-mail do seu amigo no campo "Convidar Novo Usuário" e clique em "Convidar". O utilizador precisa de já ter uma conta registada na aplicação.</p>
      </div>

      <div class="faq-item">
        <h4>Como gero um relatório em PDF?</h4>
        <p>Vá para a seção "Relatório", use os filtros para selecionar o estoque, o mês e o ano que deseja analisar. As movimentações aparecerão na tabela abaixo. Em seguida, clique no botão "Gerar PDF" para descarregar o ficheiro.</p>
      </div>

      <div class="faq-item">
        <h4>Para que serve a "Quantidade Mínima para Alerta"?</h4>
        <p>Este valor define um limite de quantidade. Quando a quantidade de um produto for igual ou inferior a este número, um aviso de "Estoque Baixo" será exibido de forma destacada na página "Início", ajudando-o a saber quando precisa de repor os seus itens.</p>
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
    const yearInput = document.getElementById('report-year-select');
    yearInput.value = new Date().getFullYear();
    const inventoryId = document.getElementById('report-inventory-select').value;
    const month = document.getElementById('report-month-select').value;
    firestore.loadReport(inventoryId, month, yearInput.value);
}

function initUsuariosPage() {
    firestore.populateInventorySelect("user-inventory-select", true);
}