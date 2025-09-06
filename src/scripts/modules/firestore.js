import * as ui from './ui.js';
import * as state from './state.js';
import { loadPage } from './pages.js';

const db = firebase.firestore();

/**
 * Renderiza o resumo global no painel (Dashboard).
 * A nova lógica é mais eficiente e corrige o erro de "tela travada".
 */
export function renderGlobalSummary() {
    const totalQuantitySpan = document.getElementById("global-total-quantity");
    const totalValueSpan = document.getElementById("global-total-value");

    if (!totalQuantitySpan || !totalValueSpan) return;

    if (state.inventoriesCache.length === 0) {
        totalQuantitySpan.textContent = "0";
        totalValueSpan.textContent = "R$ 0,00";
        return;
    }

    const inventoryTotals = {}; // Objeto para guardar os totais de cada despensa

    // Função para atualizar a UI com os totais gerais
    const updateGrandTotals = () => {
        let grandTotalQuantity = 0;
        let grandTotalValue = 0;
        for (const id in inventoryTotals) {
            grandTotalQuantity += inventoryTotals[id].quantity;
            grandTotalValue += inventoryTotals[id].value;
        }
        totalQuantitySpan.textContent = grandTotalQuantity;
        totalValueSpan.textContent = `R$ ${grandTotalValue.toFixed(2).replace('.', ',')}`;
    };

    // Configura um listener em tempo real para os produtos de CADA despensa
    state.inventoriesCache.forEach(inventory => {
        inventoryTotals[inventory.id] = { quantity: 0, value: 0 }; // Inicializa o total para esta despensa

        const productsListener = db.collection("inventories").doc(inventory.id).collection("products")
            .onSnapshot(productsSnapshot => {
                let currentInventoryQuantity = 0;
                let currentInventoryValue = 0;
                productsSnapshot.forEach(doc => {
                    const product = doc.data();
                    const quantity = product.quantity || 0;
                    const value = product.value || 0;
                    currentInventoryQuantity += quantity;
                    currentInventoryValue += quantity * value;
                });
                
                // Atualiza os totais para esta despensa específica
                inventoryTotals[inventory.id] = {
                    quantity: currentInventoryQuantity,
                    value: currentInventoryValue,
                };
                
                // Recalcula e renderiza o total geral na tela
                updateGrandTotals();
            });
        
        // Adiciona o listener ao estado para que ele possa ser limpo ao mudar de página
        state.addActiveListener(productsListener);
    });
}

function renderShoppingList(container, lowStockProducts) {
    if (!container) return;

    if (lowStockProducts.length > 0) {
        let itemsHtml = lowStockProducts.map(p => `
            <div class="shopping-list-item">
        <div class="shopping-list-item-details">
            <span class="shopping-list-item-icon">🛒</span>
            <div class="shopping-list-item-name-container">
                <span class="shopping-list-item-name">${p.name}</span>
                <span class="shopping-list-inventory-name">em ${p.inventoryName}</span>
            </div>
        </div>
        <div class="shopping-list-item-info">
            <span>Estoque: ${p.quantity}</span><br>
            <span>Mínimo: ${p.minQuantity}</span>
        </div>
    </div>
        `).join('');
        container.innerHTML = `<div id="shopping-list-container">${itemsHtml}</div>`;
    } else {
        container.innerHTML = "<p>Nenhum item com estoque baixo no momento. Tudo em ordem!</p>";
    }
}

export async function renderShoppingListPage() {
    const pageContainer = document.getElementById("shopping-list-page-container");
    await checkLowStockAndRender();
    if (pageContainer) {
        renderShoppingList(pageContainer, state.shoppingList);
    }
}

export async function checkLowStockAndRender() {
    const alertContainer = document.getElementById("low-stock-alert-container");
    const shoppingListContainer = document.getElementById("shopping-list-container");

    let lowStockProducts = [];

    for (const inventory of state.inventoriesCache) {
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

    state.setShoppingList(lowStockProducts);

    if (alertContainer) {
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
                    <h3>⚠️ Alerta de Despensa Baixa</h3>
                    <div id="low-stock-list">
                        ${itemsHtml}
                    </div>
                </div>`;
        } else {
            alertContainer.innerHTML = "";
        }
    }
    
    if (shoppingListContainer) {
        renderShoppingList(shoppingListContainer, lowStockProducts);
    }
}

export function generatePdfShoppingList(jsPDF) {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString("pt-BR");

    doc.setFontSize(22);
    doc.text("Lista de Compras", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${today}`, 105, 28, { align: 'center' });

    const tableData = state.shoppingList.map(item => [
        item.name,
        `${item.quantity} / ${item.minQuantity}`,
        item.inventoryName,
    ]);

    doc.autoTable({
        startY: 40,
        head: [['Produto', 'Estoque Atual / Mínimo', 'Despensa']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] }
    });
    
    doc.save(`Lista_de_Compras_${today.replace(/\//g, '-')}.pdf`);
}

export function logMovement(inventoryId, inventoryName, productName, type, details) {
  db.collection("movements").add({
    inventoryId,
    inventoryName,
    productName,
    type,
    details,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    userId: state.currentUser.uid,
    userName: state.currentUser.displayName || state.currentUser.email,
  });
}

export function handleDeleteInventory(inventoryId, inventoryName) {
  ui.showModal(`Tem certeza que deseja apagar a despensa "${inventoryName}" e todos os seus produtos? Esta ação não pode ser desfeita.`, "confirmar", async () => {
    try {
      const inventoryRef = db.collection("inventories").doc(inventoryId);
      const batch = db.batch();

      const productsSnapshot = await inventoryRef.collection("products").get();
      productsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      const movementsSnapshot = await db.collection("movements").where("inventoryId", "==", inventoryId).get();
      movementsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      batch.delete(inventoryRef);

      await batch.commit();

      ui.showToast("Despensa apagada com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar despensa:", error);
      ui.showModal("Ocorreu um erro ao apagar a despensa.");
    }
  });
}

export async function handleAddProductFromView(form) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Adicionando...';

    const productName = form.querySelector("#add-product-name-view").value;
    const quantity = parseInt(form.querySelector("#add-product-quantity-view").value, 10);
    const value = parseFloat(form.querySelector("#add-product-value-view").value);
    const minQuantity = parseInt(form.querySelector("#add-min-quantity-view").value, 10);

    if (quantity < 0 || value < 0 || minQuantity < 0) {
        ui.showModal("Valores negativos não são permitidos.");
        button.disabled = false;
        button.textContent = 'Adicionar';
        return;
    }
    
    if (!state.activeInventoryId) {
        ui.showModal("Nenhuma despensa ativa selecionada.");
        button.disabled = false;
        button.textContent = 'Adicionar';
        return;
    }

    try {
        const inventoryRef = db.collection("inventories").doc(state.activeInventoryId);
        await inventoryRef.collection("products").add({
            name: productName,
            quantity: quantity || 0,
            value: value || 0,
            minQuantity: minQuantity || 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        const inventoryDoc = await inventoryRef.get();
        const inventoryName = inventoryDoc.data().name;
        logMovement(state.activeInventoryId, inventoryName, productName, "Entrada", `Adicionado ${quantity} unidade(s)`);

        ui.showToast("Produto adicionado com sucesso!");
        form.reset();
        ui.closeModal(ui.addProductModal);
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        ui.showModal("Ocorreu um erro ao adicionar o produto.");
    } finally {
        button.disabled = false;
        button.textContent = 'Adicionar';
    }
}

export async function handleAddInventory(form) {
  const inventoryName = form.querySelector("#inventory-name").value;

  try {
    await db.collection("inventories").add({
      name: inventoryName,
      ownerId: state.currentUser.uid,
      members: [state.currentUser.uid],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    ui.showToast("Despensa criada com sucesso!");
    form.reset();
  } catch (error) {
    console.error("Erro ao criar despensa:", error);
    ui.showModal("Ocorreu um erro ao criar a despensa.");
  }
}

export function openRenameInventoryModal(inventoryId, currentName) {
    document.getElementById('rename-inventory-id').value = inventoryId;
    document.getElementById('rename-inventory-name').value = currentName;
    ui.renameInventoryModal.style.display = 'flex';
}

export async function handleRenameInventory(form) {
    const inventoryId = form.querySelector("#rename-inventory-id").value;
    const newName = form.querySelector("#rename-inventory-name").value;

    if (!inventoryId || !newName) return;

    try {
        await db.collection("inventories").doc(inventoryId).update({
            name: newName
        });
        ui.showToast("Despensa renomeada com sucesso!");
        ui.closeModal(ui.renameInventoryModal);
    } catch (error) {
        console.error("Erro ao renomear despensa:", error);
        ui.showModal("Falha ao renomear a despensa.");
    }
}
  
export function handleDeleteProduct(productId, productName) {
  if (!state.activeInventoryId) return;
  ui.showModal(`Tem certeza de que deseja excluir o produto "${productName}"?`, "confirmar", async () => {
    try {
      await db.collection("inventories").doc(state.activeInventoryId).collection("products").doc(productId).delete();
      const inventoryDoc = await db.collection("inventories").doc(state.activeInventoryId).get();
      const inventoryName = inventoryDoc.data().name;
      logMovement(state.activeInventoryId, inventoryName, productName, "Exclusão", `Produto removido da despensa`);
      ui.showToast("Produto excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      ui.showModal("Falha ao excluir o produto.");
    }
  });
}

export async function handleConsumeProduct(productId, productName) {
    if (!state.activeInventoryId) return;

    const productRef = db.collection("inventories").doc(state.activeInventoryId).collection("products").doc(productId);

    try {
        await db.runTransaction(async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists) {
                throw "Produto não encontrado!";
            }

            const currentQuantity = productDoc.data().quantity;
            if (currentQuantity <= 0) {
                ui.showToast(`"${productName}" já está com o estoque zerado.`, "error");
                return;
            }

            transaction.update(productRef, {
                quantity: firebase.firestore.FieldValue.increment(-1)
            });
        });

        const inventoryDoc = await db.collection("inventories").doc(state.activeInventoryId).get();
        const inventoryName = inventoryDoc.data().name;
        logMovement(state.activeInventoryId, inventoryName, productName, "Ajuste", "Consumido 1 unidade");

        // --- Feedback Visual ---
        const productRow = document.querySelector(`.product-item[data-id="${productId}"]`);
        if (productRow) {
            productRow.classList.add('updated');
            setTimeout(() => {
                productRow.classList.remove('updated');
            }, 1500); // Remove a classe após a animação terminar (1.5s)
        }
        
        
    } catch (error) {
        console.error("Erro ao consumir produto:", error);
        ui.showModal("Não foi possível consumir o item.");
    }
}

export function openEditModal(productId, currentName, currentQuantity, currentValue) {
  document.getElementById('edit-product-id').value = productId;
  document.getElementById('edit-product-name').value = currentName;
  document.getElementById('edit-product-quantity').value = currentQuantity;
  document.getElementById('edit-product-value').value = currentValue || '';
  const productRef = db.collection("inventories").doc(state.activeInventoryId).collection("products").doc(productId);
  productRef.get().then(doc => {
      if (doc.exists) {
          document.getElementById('edit-min-quantity').value = doc.data().minQuantity || '';
      }
  });
  ui.editModal.style.display = 'flex';
  ui.focusFirstInput(ui.editModal); // --- MODIFICAÇÃO AQUI ---
}

export async function handleUpdateProduct(form) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Salvando...';

    const productId = form.querySelector("#edit-product-id").value;
    const newName = form.querySelector("#edit-product-name").value;
    const newQuantity = parseInt(form.querySelector("#edit-product-quantity").value, 10);
    const newValue = parseFloat(form.querySelector("#edit-product-value").value);
    const newMinQuantity = parseInt(form.querySelector("#edit-min-quantity").value, 10);

    if (newQuantity < 0 || newValue < 0 || newMinQuantity < 0) {
        ui.showModal("Valores negativos não são permitidos.");
        button.disabled = false;
        button.textContent = 'Guardar Alterações';
        return;
    }
    
    if (!state.activeInventoryId || !productId) {
        button.disabled = false;
        button.textContent = 'Guardar Alterações';
        return;
    }

    try {
        const productRef = db.collection("inventories").doc(state.activeInventoryId).collection("products").doc(productId);
        const productDoc = await productRef.get();
        const oldQuantity = productDoc.data().quantity;

        await productRef.update({
            name: newName,
            quantity: newQuantity || 0,
            value: newValue || 0,
            minQuantity: newMinQuantity || 0
        });

        const inventoryDoc = await db.collection("inventories").doc(state.activeInventoryId).get();
        const inventoryName = inventoryDoc.data().name;
        const detail = `Quantidade alterada de ${oldQuantity} para ${newQuantity}`;
        logMovement(state.activeInventoryId, inventoryName, newName, "Ajuste", detail);

        ui.showToast("Produto atualizado com sucesso!");
        ui.closeModal(ui.editModal);
    } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        ui.showModal("Falha ao atualizar o produto.");
    } finally {
        button.disabled = false;
        button.textContent = 'Guardar Alterações';
    }
}

export async function handleChangeName(form) {
    const newName = form.querySelector("#new-display-name").value;
    if (!newName) return;
    try {
        await state.currentUser.updateProfile({
            displayName: newName
        });
        await db.collection("users").doc(state.currentUser.uid).update({
            name: newName
        });
        ui.userDisplayNameSpan.textContent = newName;
        ui.showToast("Nome alterado com sucesso!");
    } catch (error) {
        console.error("Erro ao alterar nome:", error);
        ui.showModal("Não foi possível alterar o nome.");
    }
}

export async function handleChangePassword(form) {
    const currentPassword = form.querySelector("#current-password").value;
    const newPassword = form.querySelector("#new-password").value;

    if (currentPassword === newPassword) {
        ui.showModal("A nova senha não pode ser igual à senha atual.");
        return; // Impede que o resto da função seja executado
    }

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(state.currentUser.email, currentPassword);
        await state.currentUser.reauthenticateWithCredential(credential);
        await state.currentUser.updatePassword(newPassword);
        ui.showToast("Senha alterada com sucesso!");
        form.reset();
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        ui.showModal("Falha ao alterar a senha. Verifique sua senha atual.");
    }
}

export async function handleInviteUser(form) {
    const email = form.querySelector("#invite-email").value;
    const inventoryId = document.getElementById('user-inventory-select').value;

    if (!inventoryId) {
        ui.showModal("Por favor, selecione uma despensa primeiro.");
        return;
    }

    try {
        const inventoryRef = db.collection("inventories").doc(inventoryId);
        const inventoryDoc = await inventoryRef.get();

        if (!inventoryDoc.exists) {
            ui.showModal("Despensa não encontrada.");
            return;
        }

        const members = inventoryDoc.data().members || [];
        
        if (members.length >= 5) {
            ui.showModal("Esta despensa já atingiu o limite de 5 membros.");
            return;
        }

        const userQuery = await db.collection("users").where("email", "==", email).get();
        if (userQuery.empty) {
            ui.showModal("Usuário não encontrado com este e-mail.");
            return;
        }
        const userToAdd = userQuery.docs[0];
        const userId = userToAdd.id;
        
        if (members.includes(userId)) {
            ui.showModal("Este usuário já é membro desta despensa.");
            return;
        }

        await inventoryRef.update({
            members: firebase.firestore.FieldValue.arrayUnion(userId)
        });

        ui.showToast("Usuário convidado com sucesso!");
        form.reset();
        loadUsersForInventory(inventoryId); // Adicione esta linha
    } catch (error) {
        console.error("Erro ao convidar usuário:", error);
        ui.showModal("Ocorreu um erro ao convidar o usuário.");
    }
}

export function handleRemoveUser(userId, userEmail) {
  const inventoryId = document.getElementById('user-inventory-select').value;
  if (!inventoryId) return;

  ui.showModal(`Tem certeza que deseja remover ${userEmail} desta despensa?`, "confirmar", async () => {
    try {
      await db.collection("inventories").doc(inventoryId).update({
        members: firebase.firestore.FieldValue.arrayRemove(userId)
      });
      ui.showToast("Usuário removido com sucesso!");
      loadUsersForInventory(inventoryId); // Adicione esta linha
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      ui.showModal("Falha ao remover o usuário.");
    }
  });
}

export function populateInventorySelect(selectId, requiredOption = false) {
    const inventorySelect = document.getElementById(selectId);
    if (!inventorySelect) return;
    inventorySelect.innerHTML = requiredOption ? '<option value="">Selecione uma despensa...</option>' : '<option value="all">Todas as Despensas</option>';
    state.inventoriesCache.forEach((inv) => {
        const option = document.createElement("option");
        option.value = inv.id;
        option.textContent = inv.name;
        inventorySelect.appendChild(option);
    });
}

export function loadInventories() {
  const listener = db.collection("inventories").where("members", "array-contains", state.currentUser.uid)
    .onSnapshot((snapshot) => {
      state.setInventoriesCache(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const currentListDiv = document.getElementById("inventory-list");
      if (currentListDiv) {
        currentListDiv.innerHTML = "";
        if (state.inventoriesCache.length === 0) {
          currentListDiv.innerHTML = `
            <div class="empty-state">
              <p>Você ainda não tem nenhuma despensa.</p>
              <button id="create-first-inventory-btn" class="small-button">Criar minha primeira despensa</button>
            </div>
          `;
        } else {
          state.inventoriesCache.forEach((inventory) => {
            const isOwner = inventory.ownerId === state.currentUser.uid;
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
    state.addActiveListener(listener);
}

export function viewInventoryProducts(inventoryId, inventoryName) {
  state.clearActiveListeners();
  state.setActiveInventoryId(inventoryId);

  ui.pageTitle.textContent = `Produtos em: ${inventoryName}`;
  ui.contentArea.innerHTML = `
    <button id="back-to-inventories" class="back-button">← Voltar</button>
    <div class="card">
        <div class="card-header">
            <h3>Produtos na despensa "${inventoryName}"</h3>
            <button id="add-product-in-view-btn" class="small-button">+ Adicionar Novo</button>
        </div>

        <div class="product-controls">
            <div class="search-container">
                <span class="search-icon">🔍</span>
                <input type="text" id="search-products" placeholder="Pesquisar por nome do produto...">
            </div>
            <div class="sort-container">
                <label for="sort-select">Ordenar por:</label>
                <select id="sort-select">
                    <option value="default">Padrão (Mais Recente)</option>
                    <option value="name-asc">Nome (A-Z)</option>
                    <option value="name-desc">Nome (Z-A)</option>
                    <option value="quantity-asc">Quantidade (Menor > Maior)</option>
                    <option value="quantity-desc">Quantidade (Maior > Menor)</option>
                </select>
            </div>
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
  const sortSelect = document.getElementById("sort-select");

  let allProducts = [];

  const renderProducts = (products) => {
    productListView.innerHTML = "";
    if (products.length === 0) {
      productListView.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum produto encontrado.</td></tr>';
      return;
    }
    products.forEach(product => {
      const row = document.createElement("tr");
      const totalValue = (product.quantity || 0) * (product.value || 0);
      
      const isOutOfStock = product.quantity <= 0;

      row.className = "product-item";
      // Adicionando uma classe para itens com baixo estoque para estilização opcional
      if (product.minQuantity > 0 && product.quantity <= product.minQuantity) {
        row.classList.add('low-stock-row'); 
      }

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
            <button class="action-button edit-button" aria-label="Editar Produto">Editar</button>
            <button class="action-button delete-button" aria-label="Excluir Produto">Excluir</button>
          </div>
        </td>`;
      productListView.appendChild(row);
    });
  };
  
  // Função para aplicar filtros e ordenação
  const applyFiltersAndSort = () => {
    let filteredProducts = [...allProducts];

    // Aplicar filtro de pesquisa
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    // Aplicar ordenação
    const sortValue = sortSelect.value;
    if (sortValue === 'name-asc') {
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortValue === 'name-desc') {
        filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortValue === 'quantity-asc') {
        filteredProducts.sort((a, b) => a.quantity - b.quantity);
    } else if (sortValue === 'quantity-desc') {
        filteredProducts.sort((a, b) => b.quantity - a.quantity);
    }
    // "default" já está ordenado por data de criação vindo do Firebase.

    renderProducts(filteredProducts);
  };

  const productsListener = db.collection("inventories").doc(inventoryId).collection("products").orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      allProducts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      applyFiltersAndSort(); // Renderiza com os filtros e ordenação atuais
    });
  state.addActiveListener(productsListener);

  searchInput.addEventListener('input', applyFiltersAndSort);
  sortSelect.addEventListener('change', applyFiltersAndSort);
}

export async function loadReport(inventoryId, month, year) {
    state.clearActiveListeners();
    const reportBody = document.getElementById("report-list-body");

    if (!inventoryId) {
        reportBody.innerHTML = '<tr><td colspan="5">Selecione uma despensa para começar.</td></tr>';
        state.setLastReportData([]);
        return;
    }

    let movementsQuery = db.collection("movements");

    if (inventoryId !== "all") {
        movementsQuery = movementsQuery.where("inventoryId", "==", inventoryId);
    } else {
        const userInventories = state.inventoriesCache.map(inv => inv.id);
        if (userInventories.length > 0) {
            movementsQuery = movementsQuery.where("inventoryId", "in", userInventories);
        } else {
             reportBody.innerHTML = '<tr><td colspan="5">Nenhuma movimentação para exibir.</td></tr>';
             state.setLastReportData([]);
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
    
    const userCache = {};

    const movementsListener = movementsQuery.orderBy("timestamp", "desc").onSnapshot(async (snapshot) => {
        if (!reportBody) return;
        reportBody.innerHTML = "";
        const reportData = [];
        
        if (snapshot.empty) {
            reportBody.innerHTML = '<tr><td colspan="5">Nenhuma movimentação para exibir com os filtros atuais.</td></tr>';
        } else {
            const promises = snapshot.docs.map(async (doc) => {
                const move = doc.data();
                let userName = move.userName;

                if (!userName && move.userId) {
                    if (userCache[move.userId]) {
                        userName = userCache[move.userId];
                    } else {
                        try {
                            const userDoc = await db.collection("users").doc(move.userId).get();
                            userName = userDoc.exists ? userDoc.data().name || userDoc.data().email : 'Usuário Desconhecido';
                            userCache[move.userId] = userName;
                        } catch (e) {
                            userName = 'Usuário Desconhecido';
                        }
                    }
                } else if (!userName) {
                    userName = 'N/A';
                }

                return { ...move, userName };
            });

            const movesWithUsers = await Promise.all(promises);

            movesWithUsers.forEach(move => {
                const date = move.timestamp ? move.timestamp.toDate().toLocaleString("pt-BR") : "N/A";
                const typeClass = move.type.toLowerCase().replace('ç', 'c').replace('ã', 'a');
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${date}</td>
                    <td>${move.productName}</td>
                    <td><span class="badge badge-${typeClass}">${move.type}</span></td>
                    <td>${move.details}</td>
                    <td>${move.userName}</td>`;
                reportBody.appendChild(row);
                reportData.push([date, move.productName, move.type, move.details, move.userName]);
            });
        }
        state.setLastReportData(reportData);
    }, (error) => { ui.showModal("Erro ao carregar relatório."); console.error(error); });
    
    state.addActiveListener(movementsListener);
}
export async function loadUsersForInventory(inventoryId) {
    const userListDiv = document.getElementById('user-list');
    if (!userListDiv) return;

    userListDiv.innerHTML = '<p>Carregando usuários...</p>';

    try {
        const inventoryRef = db.collection("inventories").doc(inventoryId);
        const inventoryDoc = await inventoryRef.get();

        if (!inventoryDoc.exists) {
            userListDiv.innerHTML = '<p>Despensa não encontrada.</p>';
            return;
        }

        const inventoryData = inventoryDoc.data();
        const members = inventoryData.members || [];
        const ownerId = inventoryData.ownerId;

        if (members.length === 0) {
            userListDiv.innerHTML = '<p>Nenhum usuário nesta despensa.</p>';
            return;
        }

        const userPromises = members.map(userId => db.collection('users').doc(userId).get());
        const userDocs = await Promise.all(userPromises);

        let usersHtml = '';
        userDocs.forEach(doc => {
            if (doc.exists) {
                const user = doc.data();
                const isOwner = user.uid === ownerId;
                usersHtml += `
                    <div class="user-item" data-uid="${user.uid}" data-email="${user.email}">
                        <div class="user-details">
                            <span class="user-email">${user.name || user.email}</span>
                            ${isOwner ? '<span class="user-role">(Dono)</span>' : ''}
                        </div>
                        <div class="user-actions">
                            ${!isOwner ? `<button class="action-button delete-button remove-user-button" data-uid="${user.uid}" data-email="${user.email}">Remover</button>` : ''}
                        </div>
                    </div>
                `;
            }
        });

        userListDiv.innerHTML = usersHtml;

    } catch (error) {
        console.error("Erro ao carregar usuários da despensa:", error);
        userListDiv.innerHTML = '<p>Ocorreu um erro ao carregar os usuários.</p>';
    }
}

export function generatePdfReport(jsPDF) {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("pt-BR");
  const inventorySelect = document.getElementById('report-inventory-select');
  const inventoryName = inventorySelect.options[inventorySelect.selectedIndex].text;
  const monthSelect = document.getElementById('report-month-select');
  const monthName = monthSelect.options[monthSelect.selectedIndex].text;
  const year = document.getElementById('report-year-select').value || 'Todos';

  doc.setFontSize(18);
  doc.text("Relatório de Movimentações", 105, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`Despensa: ${inventoryName} | Período: ${monthName} de ${year}`, 105, 28, { align: 'center' });

  if (state.lastReportData.length === 0) {
    doc.text("Nenhuma movimentação para exibir com os filtros atuais.", 14, 45);
  } else {
    doc.autoTable({
      startY: 40,
      head: [['Data', 'Produto', 'Tipo', 'Detalhes', 'Usuário']],
      body: state.lastReportData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }
    });
  }

  doc.save(`Relatorio_Movimentacoes_${today.replace(/\//g, '-')}.pdf`);
}