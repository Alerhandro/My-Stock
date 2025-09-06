const auth = firebase.auth();
const db = firebase.firestore();

// --- Seleções de elementos da UI ---
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const resetPasswordSection = document.getElementById("reset-password-section");
const allFormSections = document.querySelectorAll(".form-section");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const resetPasswordForm = document.getElementById("reset-password-form");

const showRegisterLink = document.getElementById("show-register");
const showLoginFromRegisterLink = document.getElementById("show-login-from-register");
const showResetPasswordLink = document.getElementById("show-reset-password");
const showLoginFromResetLink = document.getElementById("show-login-from-reset");

const alertModal = document.getElementById("alert-modal");
const modalMessage = document.getElementById("modal-message");
const modalOkButton = document.getElementById("modal-ok-button");
const closeModalButton = alertModal.querySelector(".close-button");

// --- FUNÇÕES UTILITÁRIAS ---

function showModal(message) {
  modalMessage.textContent = message;
  alertModal.style.display = "flex";
}

function closeModal() {
  alertModal.style.display = "none";
}

function toggleButtonLoading(button, isLoading) {
  const buttonText = button.querySelector('.button-text');
  const spinner = button.querySelector('.spinner');
  
  if (isLoading) {
    button.disabled = true;
    buttonText.style.opacity = '0';
    spinner.style.display = 'block';
  } else {
    button.disabled = false;
    buttonText.style.opacity = '1';
    spinner.style.display = 'none';
  }
}

function showSection(sectionToShow) {
  allFormSections.forEach(section => {
    section.classList.remove('active');
  });
  sectionToShow.classList.add('active');
}

// --- EVENT LISTENERS ---

// Authentication State Change
auth.onAuthStateChanged((user) => {
  if (user && user.emailVerified) {
    window.api.send("navigate", "home.html");
  }
});

// Troca de formulário
showRegisterLink.addEventListener("click", () => showSection(registerSection));
showLoginFromRegisterLink.addEventListener("click", () => showSection(loginSection));
showResetPasswordLink.addEventListener("click", () => showSection(resetPasswordSection));
showLoginFromResetLink.addEventListener("click", () => showSection(loginSection));

// Controles de Modais
modalOkButton.addEventListener("click", closeModal);
closeModalButton.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
  if (e.target == alertModal) closeModal();
});

// Visibilidade da senha
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function (e) {
        const passwordInput = this.previousElementSibling;
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

// --- LÓGICA DE ENVIO DE FORMULÁRIOS ---

// Registro
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(button, true);

  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById("register-confirm-password").value;

  if (password !== confirmPassword) {
    showModal("As senhas não coincidem. Por favor, tente novamente.");
    toggleButtonLoading(button, false);
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    await user.updateProfile({ displayName: name });
    await user.sendEmailVerification();
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      name: name,
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await auth.signOut();
    showModal("Usuário registado com sucesso! Um link de verificação foi enviado para o seu e-mail. Por favor, verifique-o antes de fazer login.");
    showSection(loginSection);
    registerForm.reset();
  } catch (error) {
    console.error("Erro no registo:", error);
    let message = "Ocorreu um erro ao tentar registar. Tente novamente.";
    if (error.code === "auth/email-already-in-use") {
      message = "Este endereço de e-mail já está em uso. Tente fazer login ou use um e-mail diferente.";
    } else if (error.code === "auth/weak-password") {
      message = "A senha é muito fraca. Use pelo menos 6 caracteres.";
    } else if (error.code === "auth/invalid-email") {
      message = "O formato do e-mail é inválido. Por favor, verifique-o.";
    }
    showModal(message);
  } finally {
    toggleButtonLoading(button, false);
  }
});

// Login
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const button = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(button, true);

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      if (user && !user.emailVerified) {
        auth.signOut();
        showModal("Seu e-mail ainda não foi verificado. Por favor, clique no link que enviamos para sua caixa de entrada.");
        toggleButtonLoading(button, false);
      }
      // A navegação para 'home.html' é tratada pelo onAuthStateChanged
    })
    .catch((error) => {
      console.error("Erro no login:", error);
      let message = "Ocorreu um erro. Tente novamente.";
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        message = "E-mail ou senha incorretos. Por favor, tente novamente.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Erro de rede. Verifique sua conexão com a internet.";
      }
      showModal(message);
      toggleButtonLoading(button, false);
    });
});

// Resetar senha
resetPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.target.querySelector('button[type="submit"]');
  toggleButtonLoading(button, true);

  const email = document.getElementById("reset-email").value;
  
  try {
    await auth.sendPasswordResetEmail(email);
    showModal("E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada (e a pasta de spam).");
    showSection(loginSection);
  } catch (error) {
    console.error("Erro ao enviar e-mail de redefinição:", error);
    let message = "Ocorreu um erro. Tente novamente.";
    if (error.code === "auth/user-not-found") {
      message = "Nenhum usuário encontrado com este endereço de e-mail.";
    }
    showModal(message);
  } finally {
    toggleButtonLoading(button, false);
  }
});


showSection(loginSection);