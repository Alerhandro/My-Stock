// Obtém as referências para Auth e Firestore
const auth = firebase.auth();
const db = firebase.firestore();
const { jsPDF } = window.jspdf; // Importa o jsPDF

// --- ELEMENTOS GLOBAIS DA UI ---
const userDisplayNameSpan = document.getElementById("user-display-name");
const logoutButton = document.getElementById("logout-button");
const contentArea = document.getElementById("content-area");
const pageTitle = document.getElementById("page-title");
const menuItems = document.querySelectorAll(".menu-item");
// Modais
const alertModal = document.getElementById("alert-modal");
const modalMessage = document.getElementById("modal-message");
const modalOkButton = document.getElementById("modal-ok-button");
const modalCancelButton = document.getElementById("modal-cancel-button");
const editModal = document.getElementById("edit-modal");
const addProductModal = document.getElementById("add-product-modal");
const themeSelectModal = document.getElementById("theme-select-modal");
const renameInventoryModal = document.getElementById("rename-inventory-modal");

// --- VARIÁVEIS DE ESTADO GLOBAL ---
let currentUser = null;
let inventoriesCache = [];
let activeInventoryId = null;
let confirmCallback = null;
let activeListeners = [];
let lastReportData = []; // Armazena os dados do último relatório gerado

// --- TEMPLATES HTML PARA AS PÁGINAS ---
const templates = {
  // ATUALIZADO: O template 'inicio' agora é um dashboard
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
  // ATUALIZADO: Template 'relatorio' sem o card de resumo
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
                    <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Detalhes</th></tr></thead>
                    <tbody id="report-list-body"><tr><td colspan="4">Selecione um estoque para ver as movimentações.</td></tr></tbody>
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
};

function showToast(message, type = "success", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("hide");
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

function showModal(message, type = "alert", onConfirm = null) {
  modalMessage.textContent = message;
  modalOkButton.textContent = type === "confirm" ? "Confirmar" : "OK";
  modalCancelButton.style.display = type === "confirm" ? "inline-block" : "none";
  confirmCallback = onConfirm;
  alertModal.style.display = "flex";
}

function closeModal(modalElement) {
  modalElement.style.display = "none";
}
alertModal.querySelector(".close-button").addEventListener("click", () => closeModal(alertModal));
editModal.querySelector(".close-button").addEventListener("click", () => closeModal(editModal));
addProductModal.querySelector(".close-button").addEventListener("click", () => closeModal(addProductModal));
themeSelectModal.querySelector(".close-button").addEventListener("click", () => closeModal(themeSelectModal));
renameInventoryModal.querySelector(".close-button").addEventListener("click", () => closeModal(renameInventoryModal));
modalCancelButton.addEventListener("click", () => closeModal(alertModal));
modalOkButton.addEventListener("click", () => {
  if (confirmCallback) confirmCallback();
  closeModal(alertModal);
});

function applyTheme(theme) {
  document.body.classList.remove("dark-theme", "ocean-theme", "sunset-theme", "pastel-light-theme", "pastel-dark-theme");
  if (theme !== "light") {
    document.body.classList.add(theme);
  }
}
const themeOptions = [ { value: "light", name: "Claro", color: "#f4f7fa" }, { value: "dark-theme", name: "Escuro", color: "#0f172a" }, { value: "ocean-theme", name: "Oceano", color: "#0c4a6e" }, { value: "sunset-theme", name: "Cenoura", color: "#f97316" }, { value: "pastel-light-theme", name: "Pastel", color: "#ffb6c1" }, { value: "pastel-dark-theme", name: "Celeste", color: "#81e6d9" },];
function openThemeModal() {
  const themeGrid = document.getElementById("theme-selector-grid");
  const currentTheme = localStorage.getItem("theme") || "light";
  themeGrid.innerHTML = "";
  themeOptions.forEach((theme) => {
    const isChecked = theme.value === currentTheme ? "checked" : "";
    const label = document.createElement("label");
    label.innerHTML = `<input type="radio" name="theme" value="${theme.value}" ${isChecked}><span class="theme-swatch" style="background-color: ${theme.color};"></span> ${theme.name}`;
    themeGrid.appendChild(label);
  });
  themeGrid.onchange = (e) => {
    if (e.target.name === "theme") {
      const newTheme = e.target.value;
      applyTheme(newTheme);
      localStorage.setItem("theme", newTheme);
    }
  };
  themeSelectModal.style.display = "flex";
}

function loadPage(page) {
  activeListeners.forEach(unsubscribe => unsubscribe());
  activeListeners = [];

  const pageTitles = {
    inicio: "Dashboard",
    estoque: "Gerenciar Estoques",
    relatorio: "Relatórios",
    usuarios: "Gerenciar Usuários",
    configuracoes: "Configurações",
  };
  pageTitle.textContent = pageTitles[page] || "Página";
  contentArea.innerHTML = templates[page];
  menuItems.forEach((item) =>
    item.classList.toggle("active", item.getAttribute("data-page") === page)
  );

  if (page === "inicio") initInicioPage();
  if (page === "estoque") initEstoquePage();
  if (page === "relatorio") initRelatorioPage();
  if (page === "usuarios") initUsuariosPage();
  if (page === "configuracoes") initConfiguracoesPage();
}

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    userDisplayNameSpan.textContent = user.displayName || user.email;
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);
    initializeApp();
  } else {
    currentUser = null;
    api.send("navigate", "login.html");
  }
});

async function initializeApp() {
    const snapshot = await db.collection("inventories").where("members", "array-contains", currentUser.uid).get();
    inventoriesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    loadPage("inicio"); // Agora inicia na página 'inicio'
}

logoutButton.addEventListener("click", () => auth.signOut());
menuItems.forEach((item) =>
  item.addEventListener("click", () => loadPage(item.getAttribute("data-page")))
);

document.addEventListener('submit', (e) => {
    e.preventDefault();
    const formId = e.target.id;
    if (formId === 'edit-product-form') handleUpdateProduct(e.target);
    if (formId === 'rename-inventory-form') handleRenameInventory(e.target);
    if (formId === 'add-product-from-view-form') handleAddProductFromView(e.target);
    if (formId === 'add-inventory-form') handleAddInventory(e.target);
    if (formId === 'invite-user-form') handleInviteUser(e.target);
    if (formId === 'change-name-form') handleChangeName(e.target);
    if (formId === 'change-password-form') handleChangePassword(e.target);
});

contentArea.addEventListener("click", (e) => {
  if (e.target.matches("#open-theme-modal-btn")) { openThemeModal(); }
  if (e.target.matches("#add-product-in-view-btn")) { addProductModal.style.display = "flex"; }
  if (e.target.matches("#back-to-inventories")) { loadPage("estoque"); }
  if (e.target.matches("#generate-pdf-btn")) { generatePdf(); }
  
  const inventoryItem = e.target.closest(".inventory-item.interactive");
  if (inventoryItem && !e.target.closest('.inventory-actions')) {
    viewInventoryProducts(inventoryItem.dataset.id, inventoryItem.dataset.name);
  }

  if (e.target.matches(".edit-button")) {
    const productItem = e.target.closest(".product-item");
    if (productItem) {
      openEditModal(productItem.dataset.id, productItem.dataset.name, productItem.dataset.quantity, productItem.dataset.value);
    }
  }
  if (e.target.matches(".delete-button")) {
    const productItem = e.target.closest(".product-item");
    if (productItem) {
      handleDeleteProduct(productItem.dataset.id, productItem.dataset.name);
    }
  }

  if (e.target.matches(".consume-button")) {
    const productItem = e.target.closest(".product-item");
    if (productItem) {
        handleConsumeProduct(productItem.dataset.id, productItem.dataset.name);
    }
  }
  
  if (e.target.matches(".edit-inventory-button")) {
    e.stopPropagation();
    const inventoryItem = e.target.closest(".inventory-item");
    if (inventoryItem) {
      openRenameInventoryModal(inventoryItem.dataset.id, inventoryItem.dataset.name);
    }
  }
  if (e.target.matches(".delete-inventory-button")) {
    e.stopPropagation();
    const inventoryItem = e.target.closest(".inventory-item");
    if (inventoryItem) {
      handleDeleteInventory(inventoryItem.dataset.id, inventoryItem.dataset.name);
    }
  }

  if (e.target.matches(".remove-user-button")) {
    const userItem = e.target.closest(".user-item");
    if (userItem) {
      handleRemoveUser(userItem.dataset.uid, userItem.dataset.email);
    }
  }
});

contentArea.addEventListener("change", (e) => {
    if (e.target.id === "report-inventory-select" || e.target.id === "report-month-select" || e.target.id === "report-year-select") {
        const inventoryId = document.getElementById('report-inventory-select').value;
        const month = document.getElementById('report-month-select').value;
        const year = document.getElementById('report-year-select').value;
        loadReport(inventoryId, month, year);
    }
    if (e.target.id === "user-inventory-select") {
        const selectedId = e.target.value;
        document.getElementById("user-management-content").style.display = selectedId ? "block" : "none";
        if (selectedId) loadUsersForInventory(selectedId);
    }
});

// --- FUNÇÕES PRINCIPAIS ---

function logMovement(inventoryId, inventoryName, productName, type, details) {
  db.collection("movements").add({
    inventoryId,
    inventoryName,
    productName,
    type,
    details,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    userId: currentUser.uid,
  });
}

async function handleAddProductFromView(form) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Adicionando...';

    const productName = form.querySelector("#add-product-name-view").value;
    const quantity = parseInt(form.querySelector("#add-product-quantity-view").value, 10);
    const value = parseFloat(form.querySelector("#add-product-value-view").value);
    const minQuantity = parseInt(form.querySelector("#add-min-quantity-view").value, 10);

    if (quantity < 0 || value < 0 || minQuantity < 0) {
        showModal("Valores negativos não são permitidos.");
        button.disabled = false;
        button.textContent = 'Adicionar';
        return;
    }
    
    if (!activeInventoryId) {
        showModal("Nenhum estoque ativo selecionado.");
        button.disabled = false;
        button.textContent = 'Adicionar';
        return;
    }

    try {
        const inventoryRef = db.collection("inventories").doc(activeInventoryId);
        await inventoryRef.collection("products").add({
            name: productName,
            quantity: quantity || 0,
            value: value || 0,
            minQuantity: minQuantity || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        const inventoryDoc = await inventoryRef.get();
        const inventoryName = inventoryDoc.data().name;
        logMovement(activeInventoryId, inventoryName, productName, "Entrada", `Adicionado ${quantity} unidade(s)`);

        showToast("Produto adicionado com sucesso!");
        form.reset();
        closeModal(addProductModal);
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        showModal("Ocorreu um erro ao adicionar o produto.");
    } finally {
        button.disabled = false;
        button.textContent = 'Adicionar';
    }
}

async function handleAddInventory(form) {
  const inventoryName = form.querySelector("#inventory-name").value;

  try {
    await db.collection("inventories").add({
      name: inventoryName,
      ownerId: currentUser.uid,
      members: [currentUser.uid],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToast("Estoque criado com sucesso!");
    form.reset();
  } catch (error) {
    console.error("Erro ao criar estoque:", error);
    showModal("Ocorreu um erro ao criar o estoque.");
  }
}

function openRenameInventoryModal(inventoryId, currentName) {
    document.getElementById('rename-inventory-id').value = inventoryId;
    document.getElementById('rename-inventory-name').value = currentName;
    renameInventoryModal.style.display = 'flex';
}

async function handleRenameInventory(form) {
    const inventoryId = form.querySelector("#rename-inventory-id").value;
    const newName = form.querySelector("#rename-inventory-name").value;

    if (!inventoryId || !newName) return;

    try {
        await db.collection("inventories").doc(inventoryId).update({
            name: newName
        });
        showToast("Estoque renomeado com sucesso!");
        closeModal(renameInventoryModal);
        loadInventories();
    } catch (error) {
        console.error("Erro ao renomear estoque:", error);
        showModal("Falha ao renomear o estoque.");
    }
}

async function handleDeleteInventory(inventoryId, inventoryName) {
  showModal(`Tem certeza que deseja apagar o estoque "${inventoryName}" e todos os seus produtos? Esta ação não pode ser desfeita.`, "confirm", async () => {
    try {
      const inventoryRef = db.collection("inventories").doc(inventoryId);
      const productsSnapshot = await inventoryRef.collection("products").get();
      const batch = db.batch();

      productsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      batch.delete(inventoryRef);

      await batch.commit();

      const movementsSnapshot = await db.collection("movements").where("inventoryId", "==", inventoryId).get();
      const movementsBatch = db.batch();
      movementsSnapshot.forEach(doc => {
        movementsBatch.delete(doc.ref);
      });
      await movementsBatch.commit();

      showToast("Estoque apagado com sucesso!");
      loadInventories();
    } catch (error) {
      console.error("Erro ao apagar estoque:", error);
      showModal("Ocorreu um erro ao apagar o estoque.");
    }
  });
}

function handleDeleteProduct(productId, productName) {
  if (!activeInventoryId) return;
  showModal(`Tem certeza de que deseja excluir o produto "${productName}"?`, "confirm", async () => {
    try {
      await db.collection("inventories").doc(activeInventoryId).collection("products").doc(productId).delete();
      const inventoryDoc = await db.collection("inventories").doc(activeInventoryId).get();
      const inventoryName = inventoryDoc.data().name;
      logMovement(activeInventoryId, inventoryName, productName, "Exclusão", `Produto removido do estoque`);
      showToast("Produto excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      showModal("Falha ao excluir o produto.");
    }
  });
}

async function handleConsumeProduct(productId, productName) {
    if (!activeInventoryId) return;

    const productRef = db.collection("inventories").doc(activeInventoryId).collection("products").doc(productId);

    try {
        await db.runTransaction(async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists) {
                throw "Produto não encontrado!";
            }

            const currentQuantity = productDoc.data().quantity;
            if (currentQuantity <= 0) {
                showToast(`"${productName}" já está com o estoque zerado.`, "error");
                return; 
            }

            transaction.update(productRef, {
                quantity: firebase.firestore.FieldValue.increment(-1)
            });
        });

        const inventoryDoc = await db.collection("inventories").doc(activeInventoryId).get();
        const inventoryName = inventoryDoc.data().name;
        logMovement(activeInventoryId, inventoryName, productName, "Ajuste", "Consumido 1 unidade");
        
    } catch (error) {
        console.error("Erro ao consumir produto:", error);
        showModal("Não foi possível consumir o item.");
    }
}


function openEditModal(productId, currentName, currentQuantity, currentValue) {
  document.getElementById('edit-product-id').value = productId;
  document.getElementById('edit-product-name').value = currentName;
  document.getElementById('edit-product-quantity').value = currentQuantity;
  document.getElementById('edit-product-value').value = currentValue || '';
  // Precisamos buscar o valor atual de minQuantity para exibir no modal
  const productRef = db.collection("inventories").doc(activeInventoryId).collection("products").doc(productId);
  productRef.get().then(doc => {
      if (doc.exists) {
          document.getElementById('edit-min-quantity').value = doc.data().minQuantity || '';
      }
  });
  editModal.style.display = 'flex';
}

async function handleUpdateProduct(form) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Salvando...';

    const productId = form.querySelector("#edit-product-id").value;
    const newName = form.querySelector("#edit-product-name").value;
    const newQuantity = parseInt(form.querySelector("#edit-product-quantity").value, 10);
    const newValue = parseFloat(form.querySelector("#edit-product-value").value);
    const newMinQuantity = parseInt(form.querySelector("#edit-min-quantity").value, 10);

    if (newQuantity < 0 || newValue < 0 || newMinQuantity < 0) {
        showModal("Valores negativos não são permitidos.");
        button.disabled = false;
        button.textContent = 'Guardar Alterações';
        return;
    }
    
    if (!activeInventoryId || !productId) {
        button.disabled = false;
        button.textContent = 'Guardar Alterações';
        return;
    }

    try {
        const productRef = db.collection("inventories").doc(activeInventoryId).collection("products").doc(productId);
        const productDoc = await productRef.get();
        const oldQuantity = productDoc.data().quantity;

        await productRef.update({
            name: newName,
            quantity: newQuantity || 0,
            value: newValue || 0,
            minQuantity: newMinQuantity || 0
        });

        const inventoryDoc = await db.collection("inventories").doc(activeInventoryId).get();
        const inventoryName = inventoryDoc.data().name;
        const detail = `Quantidade alterada de ${oldQuantity} para ${newQuantity}`;
        logMovement(activeInventoryId, inventoryName, newName, "Ajuste", detail);

        showToast("Produto atualizado com sucesso!");
        closeModal(editModal);
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        showModal("Falha ao atualizar o produto.");
    } finally {
        button.disabled = false;
        button.textContent = 'Guardar Alterações';
    }
}

async function handleChangeName(form) {
    const newName = form.querySelector("#new-display-name").value;
    if (!newName) return;
    try {
        await currentUser.updateProfile({
            displayName: newName
        });
        await db.collection("users").doc(currentUser.uid).update({
            name: newName
        });
        userDisplayNameSpan.textContent = newName;
        showToast("Nome alterado com sucesso!");
    } catch (error) {
        console.error("Erro ao alterar nome:", error);
        showModal("Não foi possível alterar o nome.");
    }
}

async function handleChangePassword(form) {
    const currentPassword = form.querySelector("#current-password").value;
    const newPassword = form.querySelector("#new-password").value;

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPassword);
        showToast("Senha alterada com sucesso!");
        form.reset();
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        showModal("Falha ao alterar a senha. Verifique sua senha atual.");
    }
}

async function handleInviteUser(form) {
    const email = form.querySelector("#invite-email").value;
    const inventoryId = document.getElementById('user-inventory-select').value;

    if (!inventoryId) {
        showModal("Por favor, selecione um estoque primeiro.");
        return;
    }

    try {
        const inventoryRef = db.collection("inventories").doc(inventoryId);
        const inventoryDoc = await inventoryRef.get();

        if (!inventoryDoc.exists) {
            showModal("Estoque não encontrado.");
            return;
        }

        const members = inventoryDoc.data().members || [];
        
        if (members.length >= 5) {
            showModal("Este estoque já atingiu o limite de 5 membros.");
            return;
        }

        const userQuery = await db.collection("users").where("email", "==", email).get();
        if (userQuery.empty) {
            showModal("Usuário não encontrado com este e-mail.");
            return;
        }
        const userToAdd = userQuery.docs[0];
        const userId = userToAdd.id;
        
        if (members.includes(userId)) {
            showModal("Este usuário já é membro deste estoque.");
            return;
        }

        await inventoryRef.update({
            members: firebase.firestore.FieldValue.arrayUnion(userId)
        });

        showToast("Usuário convidado com sucesso!");
        form.reset();
        loadUsersForInventory(inventoryId);
    } catch (error) {
        console.error("Erro ao convidar usuário:", error);
        showModal("Ocorreu um erro ao convidar o usuário.");
    }
}

function handleRemoveUser(userId, userEmail) {
  const inventoryId = document.getElementById('user-inventory-select').value;
  if (!inventoryId) return;

  showModal(`Tem certeza que deseja remover ${userEmail} deste estoque?`, "confirm", async () => {
    try {
      await db.collection("inventories").doc(inventoryId).update({
        members: firebase.firestore.FieldValue.arrayRemove(userId)
      });
      showToast("Usuário removido com sucesso!");
      loadUsersForInventory(inventoryId);
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      showModal("Falha ao remover o usuário.");
    }
  });
}

function initInicioPage() {
    checkLowStockAndRender();
    renderGlobalSummary();
}
function initEstoquePage() {
    loadInventories();
}
function initConfiguracoesPage() {
  const nameInput = document.getElementById("new-display-name");
  if (nameInput && currentUser.displayName)
    nameInput.value = currentUser.displayName;
}
function initRelatorioPage() {
    populateInventorySelect("report-inventory-select");
    const yearInput = document.getElementById('report-year-select');
    yearInput.value = new Date().getFullYear();
    const inventoryId = document.getElementById('report-inventory-select').value;
    const month = document.getElementById('report-month-select').value;
    loadReport(inventoryId, month, yearInput.value);
}
function initUsuariosPage() {
    populateInventorySelect("user-inventory-select", true);
}

function populateInventorySelect(selectId, requiredOption = false) {
    const inventorySelect = document.getElementById(selectId);
    if (!inventorySelect) return;
    inventorySelect.innerHTML = requiredOption ? '<option value="">Selecione um estoque...</option>' : '<option value="all">Todos os Estoques</option>';
    inventoriesCache.forEach((inv) => {
        const option = document.createElement("option");
        option.value = inv.id;
        option.textContent = inv.name;
        inventorySelect.appendChild(option);
    });
}

function loadInventories() {
  const listener = db.collection("inventories").where("members", "array-contains", currentUser.uid)
    .onSnapshot((snapshot) => {
      inventoriesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const currentListDiv = document.getElementById("inventory-list");
      if (currentListDiv) {
        currentListDiv.innerHTML = "";
        if (inventoriesCache.length === 0) {
          currentListDiv.innerHTML = "<p>Nenhum estoque. Crie um novo!</p>";
        } else {
          inventoriesCache.forEach((inventory) => {
            const isOwner = inventory.ownerId === currentUser.uid;
            const item = document.createElement("div");
            item.className = "inventory-item interactive";
            item.dataset.id = inventory.id;
            item.dataset.name = inventory.name;
            let actionsHtml = isOwner ? `<div class="inventory-actions"><button class="action-button edit-inventory-button">Renomear</button><button class="action-button delete-inventory-button">Apagar</button></div>` : `<span class="view-products">Ver Produtos →</span>`;
            item.innerHTML = `<div class="inventory-details"><span class="inventory-icon">📦</span><span class="inventory-name">${inventory.name}</span></div>${actionsHtml}`;
            currentListDiv.appendChild(item);
          });
        }
      }
    });
    activeListeners.push(listener);
}

function viewInventoryProducts(inventoryId, inventoryName) {
  activeListeners.forEach(unsub => unsub());
  activeListeners = [];

  activeInventoryId = inventoryId;
  pageTitle.textContent = `Produtos em: ${inventoryName}`;
  contentArea.innerHTML = `
    <button id="back-to-inventories" class="back-button">← Voltar</button>
    <div class="card">
        <div class="card-header">
            <h3>Produtos no estoque "${inventoryName}"</h3>
            <button id="add-product-in-view-btn" class="small-button">+ Adicionar Novo</button>
        </div>
        <div class="search-container">
            <span class="search-icon">🔍</span>
            <input type="text" id="search-products" placeholder="Pesquisar por nome do produto...">
        </div>
        <div id="product-list-container">
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody id="product-list-view"></tbody>
            </table>
        </div>
    </div>`;

  const productListView = document.getElementById("product-list-view");
  const searchInput = document.getElementById("search-products");

  const renderProducts = (products) => {
    productListView.innerHTML = "";
    if (products.length === 0) {
      productListView.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum produto encontrado.</td></tr>';
      return;
    }
    products.forEach(product => {
      const row = document.createElement("tr");
      const totalValue = (product.quantity || 0) * (product.value || 0);
      
      // --- INÍCIO DA CORREÇÃO ---
      // Verifica se a quantidade é 0 para desativar o botão
      const isOutOfStock = product.quantity <= 0;
      // --- FIM DA CORREÇÃO ---

      row.className = "product-item";
      row.dataset.id = product.id;
      row.dataset.name = product.name;
      row.dataset.quantity = product.quantity;
      row.dataset.value = product.value || 0;
      row.innerHTML = `
        <td>${product.name}</td>
        <td>${product.quantity}</td>
        <td>R$ ${(product.value || 0).toFixed(2).replace('.', ',')}</td>
        <td>R$ ${totalValue.toFixed(2).replace('.', ',')}</td>
        <td>
          <div class="product-actions">
            <button class="action-button consume-button" ${isOutOfStock ? 'disabled' : ''}>Consumir</button> 
            <button class="action-button edit-button">Editar</button>
            <button class="action-button delete-button">Excluir</button>
          </div>
        </td>`;
      productListView.appendChild(row);
    });
  };

  let allProducts = [];
  const productsListener = db.collection("inventories").doc(inventoryId).collection("products").orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      allProducts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      renderProducts(allProducts);
      searchInput.value = '';
    });
  activeListeners.push(productsListener);

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    renderProducts(filteredProducts);
  });
}

async function loadReport(inventoryId, month, year) {
    activeListeners.forEach(unsub => unsub());
    activeListeners = [];
    
    const reportBody = document.getElementById("report-list-body");

    if (!inventoryId) {
        reportBody.innerHTML = '<tr><td colspan="4">Selecione um estoque para começar.</td></tr>';
        lastReportData = [];
        return;
    }

    let movementsQuery = db.collection("movements");

    if (inventoryId !== "all") {
        movementsQuery = movementsQuery.where("inventoryId", "==", inventoryId);
    } else {
        const userInventories = inventoriesCache.map(inv => inv.id);
        if (userInventories.length > 0) {
            movementsQuery = movementsQuery.where("inventoryId", "in", userInventories);
        } else {
             reportBody.innerHTML = '<tr><td colspan="4">Nenhuma movimentação para exibir.</td></tr>';
             lastReportData = [];
             return;
        }
    }

    if (year && month) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, parseInt(month) + 1, 1);
        movementsQuery = movementsQuery.where('timestamp', '>=', startDate).where('timestamp', '<', endDate);
    } else if (year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(parseInt(year) + 1, 0, 1);
        movementsQuery = movementsQuery.where('timestamp', '>=', startDate).where('timestamp', '<', endDate);
    }

    const movementsListener = movementsQuery.orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        if (!reportBody) return;
        reportBody.innerHTML = "";
        lastReportData = [];
        if (snapshot.empty) {
            reportBody.innerHTML = '<tr><td colspan="4">Nenhuma movimentação para exibir com os filtros atuais.</td></tr>';
            return;
        }
        snapshot.forEach((doc) => {
            const move = doc.data();
            const date = move.timestamp ? move.timestamp.toDate().toLocaleString("pt-BR") : "N/A";
            const typeClass = move.type.toLowerCase().replace('ç', 'c').replace('ã', 'a');
            const row = document.createElement("tr");
            row.innerHTML = `<td>${date}</td><td>${move.productName}</td><td><span class="badge badge-${typeClass}">${move.type}</span></td><td>${move.details}</td>`;
            reportBody.appendChild(row);
            lastReportData.push([date, move.productName, move.type, move.details]);
        });
    }, (error) => { showModal("Erro ao carregar relatório."); console.error(error); });
    activeListeners.push(movementsListener);
}

function loadUsersForInventory(inventoryId) {
  activeListeners.forEach(unsub => unsub());
  activeListeners = [];

  const listener = db.collection("inventories").doc(inventoryId).onSnapshot(async (doc) => {
      const userListDiv = document.getElementById("user-list");
      if (!userListDiv) return;
      const inventory = doc.data();
      if (!inventory) {
          userListDiv.innerHTML = "<p>Estoque não encontrado.</p>";
          return;
      }
      const memberPromises = inventory.members.map((uid) => db.collection("users").doc(uid).get());
      const memberDocs = await Promise.all(memberPromises);
      userListDiv.innerHTML = "";
      memberDocs.forEach((memberDoc) => {
        if (memberDoc.exists) {
          const user = memberDoc.data();
          const item = document.createElement("div");
          item.className = "user-item";
          item.dataset.uid = memberDoc.id;
          item.dataset.email = user.email;
          const displayName = user.name || user.email;
          const isOwner = inventory.ownerId === memberDoc.id;
          let removeButton = "";
          if (!isOwner && inventory.ownerId === currentUser.uid) {
            removeButton = `<button class="action-button delete-button remove-user-button">Remover</button>`;
          }
          item.innerHTML = `<div><span class="user-email">${displayName}</span><br><span class="user-role">${isOwner ? "👑 Dono" : "Membro"}</span></div>${removeButton}`;
          userListDiv.appendChild(item);
        }
      });
  });
  activeListeners.push(listener);
}

async function checkLowStockAndRender() {
    const alertContainer = document.getElementById("low-stock-alert-container");
    if (!alertContainer) return;

    let lowStockProducts = [];

    for (const inventory of inventoriesCache) {
        const productsRef = db.collection("inventories").doc(inventory.id).collection("products");
        const snapshot = await productsRef.where("minQuantity", ">", 0).get();

        snapshot.forEach(doc => {
            const product = doc.data();
            if (product.quantity <= product.minQuantity) {
                lowStockProducts.push({
                    ...product,
                    id: doc.id,
                    inventoryName: inventory.name,
                    inventoryId: inventory.id
                });
            }
        });
    }

    if (lowStockProducts.length > 0) {
        let itemsHtml = lowStockProducts.map(p => `
            <div class="low-stock-item">
                <div class="low-stock-details">
                    <span class="product-name">${p.name}</span>
                    <span class="inventory-context">em ${p.inventoryName}</span>
                </div>
                <div class="low-stock-quantity">
                    <span>${p.quantity} / ${p.minQuantity}</span>
                </div>
            </div>
        `).join('');

        alertContainer.innerHTML = `
            <div class="card low-stock-alert">
                <h3>⚠️ Alerta de Estoque Baixo</h3>
                <div id="low-stock-list">
                    ${itemsHtml}
                </div>
            </div>`;
    } else {
        alertContainer.innerHTML = "";
    }
}

function renderGlobalSummary() {
    const totalQuantitySpan = document.getElementById("global-total-quantity");
    const totalValueSpan = document.getElementById("global-total-value");
    if (!totalQuantitySpan || !totalValueSpan) return;

    const userInventories = inventoriesCache.map(inv => inv.id);
    if (userInventories.length === 0) {
        totalQuantitySpan.textContent = "0";
        totalValueSpan.textContent = "R$ 0,00";
        return;
    }

    let inventoryTotals = {};

    const updateTotalSummary = () => {
        let grandTotalQuantity = 0;
        let grandTotalValue = 0;
        for (const id in inventoryTotals) {
            grandTotalQuantity += inventoryTotals[id].quantity;
            grandTotalValue += inventoryTotals[id].value;
        }
        totalQuantitySpan.textContent = grandTotalQuantity;
        totalValueSpan.textContent = `R$ ${grandTotalValue.toFixed(2).replace('.', ',')}`;
    };

    userInventories.forEach(id => {
        const productsQuery = db.collection("inventories").doc(id).collection("products");
        const listener = productsQuery.onSnapshot(snapshot => {
            let currentInventoryQuantity = 0;
            let currentInventoryValue = 0;
            snapshot.forEach(doc => {
                const product = doc.data();
                currentInventoryQuantity += product.quantity || 0;
                currentInventoryValue += (product.quantity || 0) * (product.value || 0);
            });
            inventoryTotals[id] = { quantity: currentInventoryQuantity, value: currentInventoryValue };
            updateTotalSummary();
        });
        activeListeners.push(listener);
    });
}

function generatePdf() {
    const doc = new jsPDF();
    const inventorySelect = document.getElementById('report-inventory-select');
    const monthSelect = document.getElementById('report-month-select');
    const yearInput = document.getElementById('report-year-select');

    const inventoryName = inventorySelect.options[inventorySelect.selectedIndex].text;
    const month = monthSelect.options[monthSelect.selectedIndex].text;
    const year = yearInput.value || 'Todos';
    
    doc.setFontSize(18);
    doc.text("Relatório de Movimentações de Estoque", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    doc.text(`Estoque: ${inventoryName}`, 14, 32);
    doc.text(`Período: ${month} de ${year}`, 14, 38);
    
    doc.autoTable({
        startY: 50,
        head: [['Data', 'Produto', 'Tipo', 'Detalhes']],
        body: lastReportData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] }
    });
    
    const fileName = `Relatorio_${inventoryName.replace(/\s/g, '_')}_${new Date().toLocaleDateString("pt-BR").replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
}