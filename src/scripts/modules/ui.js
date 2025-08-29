// ui.js
// Contém todas as funções relacionadas à manipulação da interface do utilizador (UI).

import { setConfirmCallback } from './state.js';

// --- Seletores de Elementos Globais ---
export const userDisplayNameSpan = document.getElementById("user-display-name");
export const logoutButton = document.getElementById("logout-button");
export const contentArea = document.getElementById("content-area");
export const pageTitle = document.getElementById("page-title");
export const menuItems = document.querySelectorAll(".menu-item");

// --- Seletores de Modais ---
export const alertModal = document.getElementById("alert-modal");
const modalMessage = document.getElementById("modal-message");
const modalOkButton = document.getElementById("modal-ok-button");
const modalCancelButton = document.getElementById("modal-cancel-button");
export const editModal = document.getElementById("edit-modal");
export const addProductModal = document.getElementById("add-product-modal");
export const themeSelectModal = document.getElementById("theme-select-modal");
export const renameInventoryModal = document.getElementById("rename-inventory-modal");

// --- Funções de UI ---

export function showToast(message, type = "success", duration = 3000) {
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

export function showModal(message, type = "alert", onConfirm = null) {
  modalMessage.textContent = message;
  modalOkButton.textContent = type === "confirmar" ? "Confirmar" : "OK";
  modalCancelButton.style.display = type === "confirmar" ? "inline-block" : "none";
  setConfirmCallback(onConfirm);
  alertModal.style.display = "flex";
}

export function closeModal(modalElement) {
  modalElement.style.display = "none";
}

export function applyTheme(theme) {
  document.body.classList.remove("dark-theme", "ocean-theme", "pastel-dark-theme", "sunset-theme", "carrot-light-theme", "purple-amethyst-theme", "purple-lavender-theme",);
  if (theme !== "light") {
    document.body.classList.add(theme);
  }
}

export function openThemeModal() {
  const themeOptions = [
    { value: "light", name: "Claro", color: "#f4f7fa" },
    { value: "dark-theme", name: "Escuro", color: "#0f172a" },
    { value: "ocean-theme", name: "Oceano", color: "#0c4a6e" },
    { value: "pastel-dark-theme", name: "Celeste", color: "#81e6d9" },
    { value: "carrot-light-theme", name: "Cenoura Suave", color: "#f97316" },
    { value: "sunset-theme", name: "Cenoura", color: "#f97316" },
    { value: "purple-lavender-theme", name: "Lavanda", color: "#8b5cf6" }, 
    { value: "purple-amethyst-theme", name: "Ametista", color: "#a78bfa" }, 
    
  ];
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