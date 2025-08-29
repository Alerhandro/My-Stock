// home.js
// Ponto de entrada principal para a lógica da página home.
// Orquestra os módulos e lida com os eventos principais.

import * as ui from './modules/ui.js';
import * as firestore from './modules/firestore.js';
import * as pages from './modules/pages.js';
import * as state from './modules/state.js';

const auth = firebase.auth();
const db = firebase.firestore();

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

auth.onAuthStateChanged((user) => {
  if (user) {
    state.setCurrentUser(user);
    ui.userDisplayNameSpan.textContent = user.displayName || user.email;
    const savedTheme = localStorage.getItem("theme") || "light";
    ui.applyTheme(savedTheme);
    initializeApp();
  } else {
    state.setCurrentUser(null);
    api.send("navigate", "login.html");
  }
});

async function initializeApp() {
    const snapshot = await db.collection("inventories").where("members", "array-contains", state.currentUser.uid).get();
    state.setInventoriesCache(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    pages.loadPage("inicio");

    // Ouve o evento de atualização do processo principal
    api.onUpdateDownloaded(() => {
        const updateModal = document.getElementById('update-modal');
        const updateNowBtn = document.getElementById('update-now-button');
        const updateLaterBtn = document.getElementById('update-later-button');

        updateNowBtn.onclick = () => api.restartApp();
        updateLaterBtn.onclick = () => ui.closeModal(updateModal);

        updateModal.style.display = 'flex';
    });
}

// --- EVENT LISTENERS GLOBAIS ---

ui.logoutButton.addEventListener("click", () => auth.signOut());

ui.menuItems.forEach((item) =>
  item.addEventListener("click", () => pages.loadPage(item.getAttribute("data-page")))
);

// Listener para formulários
document.addEventListener('submit', (e) => {
    e.preventDefault();
    const formId = e.target.id;
    if (formId === 'edit-product-form') firestore.handleUpdateProduct(e.target);
    if (formId === 'rename-inventory-form') firestore.handleRenameInventory(e.target);
    if (formId === 'add-product-from-view-form') firestore.handleAddProductFromView(e.target);
    if (formId === 'add-inventory-form') firestore.handleAddInventory(e.target);
    if (formId === 'invite-user-form') firestore.handleInviteUser(e.target);
    if (formId === 'change-name-form') firestore.handleChangeName(e.target);
    if (formId === 'change-password-form') firestore.handleChangePassword(e.target);
});

// Listener para cliques delegados na área de conteúdo
ui.contentArea.addEventListener("click", (e) => {
  if (e.target.matches("#open-theme-modal-btn")) { ui.openThemeModal(); }
  if (e.target.matches("#add-product-in-view-btn")) { ui.addProductModal.style.display = "flex"; }
  if (e.target.matches("#back-to-inventories")) { pages.loadPage("estoque"); }
  
  if (e.target.matches("#generate-pdf-btn")) { 
    const { jsPDF } = window.jspdf;
    firestore.generatePdfReport(jsPDF); 
  }
   if (e.target.matches("#print-shopping-list-btn")) {
     const { jsPDF } = window.jspdf;
     firestore.generatePdfShoppingList(jsPDF);
   }

  if (e.target.matches("#create-first-inventory-btn")) {
    const inventoryNameInput = document.getElementById('inventory-name');
    if (inventoryNameInput) {
      inventoryNameInput.focus();
      inventoryNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  const inventoryItem = e.target.closest(".inventory-item.interactive");
  if (inventoryItem && !e.target.closest('.inventory-actions')) {
    firestore.viewInventoryProducts(inventoryItem.dataset.id, inventoryItem.dataset.name);
  }

  if (e.target.matches(".edit-button")) {
    const productItem = e.target.closest(".product-item");
    if (productItem) firestore.openEditModal(productItem.dataset.id, productItem.dataset.name, productItem.dataset.quantity, productItem.dataset.value);
  }
  if (e.target.matches(".delete-button")) {
    const productItem = e.target.closest(".product-item");
    if (productItem) firestore.handleDeleteProduct(productItem.dataset.id, productItem.dataset.name);
  }

  if (e.target.matches(".consume-button")) {
    const productItem = e.target.closest(".product-item");
    if (productItem) firestore.handleConsumeProduct(productItem.dataset.id, productItem.dataset.name);
  }
  
  if (e.target.matches(".edit-inventory-button")) {
    e.stopPropagation();
    const inventoryItem = e.target.closest(".inventory-item");
    if (inventoryItem) firestore.openRenameInventoryModal(inventoryItem.dataset.id, inventoryItem.dataset.name);
  }
  if (e.target.matches(".delete-inventory-button")) {
    e.stopPropagation();
    const inventoryItem = e.target.closest(".inventory-item");
    if (inventoryItem) firestore.handleDeleteInventory(inventoryItem.dataset.id, inventoryItem.dataset.name);
  }

  if (e.target.matches(".remove-user-button")) {
    const userItem = e.target.closest(".user-item");
    if (userItem) firestore.handleRemoveUser(userItem.dataset.uid, userItem.dataset.email);
  }
});

// Listener para mudanças em selects/inputs
ui.contentArea.addEventListener("change", (e) => {
    if (e.target.id === "report-inventory-select" || e.target.id === "report-month-select" || e.target.id === "report-year-select") {
        const inventoryId = document.getElementById('report-inventory-select').value;
        const month = document.getElementById('report-month-select').value;
        const year = document.getElementById('report-year-select').value;
        firestore.loadReport(inventoryId, month, year);
    }
    if (e.target.id === "user-inventory-select") {
        const selectedId = e.target.value;
        document.getElementById("user-management-content").style.display = selectedId ? "block" : "none";
        if (selectedId) {
            firestore.loadUsersForInventory(selectedId); // Adicione esta linha
        } else {
            document.getElementById('user-list').innerHTML = '<p>Selecione uma despensa para ver os membros.</p>'; // Limpa a lista se nenhuma despensa for selecionada
        }
    }
});

// Listeners para fechar modais
ui.alertModal.querySelector(".close-button").addEventListener("click", () => ui.closeModal(ui.alertModal));
ui.editModal.querySelector(".close-button").addEventListener("click", () => ui.closeModal(ui.editModal));
ui.addProductModal.querySelector(".close-button").addEventListener("click", () => ui.closeModal(ui.addProductModal));
ui.themeSelectModal.querySelector(".close-button").addEventListener("click", () => ui.closeModal(ui.themeSelectModal));
ui.renameInventoryModal.querySelector(".close-button").addEventListener("click", () => ui.closeModal(ui.renameInventoryModal));

document.getElementById('modal-cancel-button').addEventListener("click", () => {
    ui.closeModal(ui.alertModal);
    state.setConfirmCallback(null); 
});

document.getElementById('modal-ok-button').addEventListener("click", () => {
  if (state.confirmCallback) {
      state.confirmCallback();
  }
  ui.closeModal(ui.alertModal);
  state.setConfirmCallback(null);
});