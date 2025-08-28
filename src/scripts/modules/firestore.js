// firestore.js
// Lida com todas as interações com o banco de dados Firebase Firestore.

import * as ui from './ui.js';
import * as state from './state.js';
import { loadPage } from './pages.js';

const db = firebase.firestore();

// ... (todas as outras funções permanecem exatamente iguais) ...

// --- INÍCIO DA CORREÇÃO ---
export function generatePdf(jsPDF) {
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
        head: [['Data', 'Produto', 'Tipo', 'Detalhes', 'Usuário']],
        body: state.lastReportData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] }
    });
    
    const fileName = `Relatorio_${inventoryName.replace(/\s/g, '_')}_${new Date().toLocaleDateString("pt-BR").replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
}
// --- FIM DA CORREÇÃO ---

// ... (o resto do ficheiro firestore.js continua aqui)
// (a função logMovement, handleDeleteInventory, etc.)
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
  ui.showModal(`Tem certeza que deseja apagar o estoque "${inventoryName}" e todos os seus produtos? Esta ação não pode ser desfeita.`, "confirm", async () => {
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

      ui.showToast("Estoque apagado com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar estoque:", error);
      ui.showModal("Ocorreu um erro ao apagar o estoque.");
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
        ui.showModal("Nenhum estoque ativo selecionado.");
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
    ui.showToast("Estoque criado com sucesso!");
    form.reset();
  } catch (error) {
    console.error("Erro ao criar estoque:", error);
    ui.showModal("Ocorreu um erro ao criar o estoque.");
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
        ui.showToast("Estoque renomeado com sucesso!");
        ui.closeModal(ui.renameInventoryModal);
    } catch (error) {
        console.error("Erro ao renomear estoque:", error);
        ui.showModal("Falha ao renomear o estoque.");
    }
}

export function handleDeleteProduct(productId, productName) {
  if (!state.activeInventoryId) return;
  ui.showModal(`Tem certeza de que deseja excluir o produto "${productName}"?`, "confirm", async () => {
    try {
      await db.collection("inventories").doc(state.activeInventoryId).collection("products").doc(productId).delete();
      const inventoryDoc = await db.collection("inventories").doc(state.activeInventoryId).get();
      const inventoryName = inventoryDoc.data().name;
      logMovement(state.activeInventoryId, inventoryName, productName, "Exclusão", `Produto removido do estoque`);
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
        ui.showModal("Por favor, selecione um estoque primeiro.");
        return;
    }

    try {
        const inventoryRef = db.collection("inventories").doc(inventoryId);
        const inventoryDoc = await inventoryRef.get();

        if (!inventoryDoc.exists) {
            ui.showModal("Estoque não encontrado.");
            return;
        }

        const members = inventoryDoc.data().members || [];
        
        if (members.length >= 5) {
            ui.showModal("Este estoque já atingiu o limite de 5 membros.");
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
            ui.showModal("Este usuário já é membro deste estoque.");
            return;
        }

        await inventoryRef.update({
            members: firebase.firestore.FieldValue.arrayUnion(userId)
        });

        ui.showToast("Usuário convidado com sucesso!");
        form.reset();
        loadUsersForInventory(inventoryId);
    } catch (error) {
        console.error("Erro ao convidar usuário:", error);
        ui.showModal("Ocorreu um erro ao convidar o usuário.");
    }
}

export function handleRemoveUser(userId, userEmail) {
  const inventoryId = document.getElementById('user-inventory-select').value;
  if (!inventoryId) return;

  ui.showModal(`Tem certeza que deseja remover ${userEmail} deste estoque?`, "confirm", async () => {
    try {
      await db.collection("inventories").doc(inventoryId).update({
        members: firebase.firestore.FieldValue.arrayRemove(userId)
      });
      ui.showToast("Usuário removido com sucesso!");
      loadUsersForInventory(inventoryId);
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      ui.showModal("Falha ao remover o usuário.");
    }
  });
}

export function populateInventorySelect(selectId, requiredOption = false) {
    const inventorySelect = document.getElementById(selectId);
    if (!inventorySelect) return;
    inventorySelect.innerHTML = requiredOption ? '<option value="">Selecione um estoque...</option>' : '<option value="all">Todos os Estoques</option>';
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
              <p>Você ainda não tem nenhum estoque.</p>
              <button id="create-first-inventory-btn" class="small-button">Criar meu primeiro estoque</button>
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
      const isOutOfStock = product.quantity <= 0;
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
  state.addActiveListener(productsListener);

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    renderProducts(filteredProducts);
  });
}

export function loadReport(inventoryId, month, year) {
    state.clearActiveListeners();
    const reportBody = document.getElementById("report-list-body");

    if (!inventoryId) {
        reportBody.innerHTML = '<tr><td colspan="5">Selecione um estoque para começar.</td></tr>';
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
            for (const doc of snapshot.docs) {
                const move = doc.data();
                
                let userName = move.userName;
                if (!userName) {
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
                }

                const date = move.timestamp ? move.timestamp.toDate().toLocaleString("pt-BR") : "N/A";
                const typeClass = move.type.toLowerCase().replace('ç', 'c').replace('ã', 'a');
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${date}</td>
                    <td>${move.productName}</td>
                    <td><span class="badge badge-${typeClass}">${move.type}</span></td>
                    <td>${move.details}</td>
                    <td>${userName}</td>`;
                reportBody.appendChild(row);
                reportData.push([date, move.productName, move.type, move.details, userName]);
            }
        }
        state.setLastReportData(reportData);
    }, (error) => { ui.showModal("Erro ao carregar relatório."); console.error(error); });
    
    state.addActiveListener(movementsListener);
}

export function loadUsersForInventory(inventoryId) {
  state.clearActiveListeners();

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
          if (!isOwner && inventory.ownerId === state.currentUser.uid) {
            removeButton = `<button class="action-button delete-button remove-user-button">Remover</button>`;
          }
          item.innerHTML = `<div><span class="user-email">${displayName}</span><br><span class="user-role">${isOwner ? "👑 Dono" : "Membro"}</span></div>${removeButton}`;
          userListDiv.appendChild(item);
        }
      });
  });
  state.addActiveListener(listener);
}

export async function checkLowStockAndRender() {
    const alertContainer = document.getElementById("low-stock-alert-container");
    if (!alertContainer) return;

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

export function renderGlobalSummary() {
    const totalQuantitySpan = document.getElementById("global-total-quantity");
    const totalValueSpan = document.getElementById("global-total-value");
    if (!totalQuantitySpan || !totalValueSpan) return;

    const userInventories = state.inventoriesCache.map(inv => inv.id);
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
        state.addActiveListener(listener);
    });
}