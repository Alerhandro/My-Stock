const auth = firebase.auth();
const db = firebase.firestore();

// Referências para as seções da UI
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const resetPasswordSection = document.getElementById("reset-password-section");

// Referências para os formulários
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const resetPasswordForm = document.getElementById("reset-password-form");

// Links de navegação entre as seções
const showRegisterLink = document.getElementById("show-register");
const showLoginFromRegisterLink = document.getElementById("show-login-from-register");
const showResetPasswordLink = document.getElementById("show-reset-password");
const showLoginFromResetLink = document.getElementById("show-login-from-reset");

// Elementos do Modal de Alerta
const alertModal = document.getElementById("alert-modal");
const modalMessage = document.getElementById("modal-message");
const modalOkButton = document.getElementById("modal-ok-button");
const closeModalButton = document.querySelector(".close-button");

// --- FUNÇÕES DE CONTROLE DA UI ---

function showModal(message) {
  modalMessage.textContent = message;
  alertModal.style.display = "flex";
}

function closeModal() {
  alertModal.style.display = "none";
}

function showSection(sectionToShow) {
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    resetPasswordSection.style.display = "none";
    sectionToShow.style.display = "block";
}

// --- EVENT LISTENERS DA UI ---

modalOkButton.addEventListener("click", closeModal);
closeModalButton.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
  if (e.target == alertModal) closeModal();
});

showRegisterLink.addEventListener("click", () => showSection(registerSection));
showLoginFromRegisterLink.addEventListener("click", () => showSection(loginSection));
showResetPasswordLink.addEventListener("click", () => showSection(resetPasswordSection));
showLoginFromResetLink.addEventListener("click", () => showSection(loginSection));


// --- LÓGICA DE AUTENTICAÇÃO FIREBASE ---

auth.onAuthStateChanged((user) => {
  if (user && user.emailVerified) {
    api.send("navigate", "home.html");
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );
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
    showModal(
      "Usuário registrado com sucesso! Um link de verificação foi enviado para o seu e-mail. Por favor, verifique-o antes de fazer o login."
    );
    showSection(loginSection);
  } catch (error) {
    console.error("Erro detalhado no registo: ", error);
    let message = `Erro no registo: ${error.message}`;
    if (error.code === "auth/email-already-in-use") {
      message =
        "Este endereço de e-mail já está cadastrado. Tente fazer login ou use um e-mail diferente.";
    } else if (error.code === "auth/weak-password") {
      message =
        "A senha é muito fraca. Tente uma senha com pelo menos 6 caracteres.";
    }
    showModal(message);
  }
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  auth
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      if (user && !user.emailVerified) {
        auth.signOut();
        showModal(
          "Seu e-mail ainda não foi verificado. Por favor, clique no link que enviamos para sua caixa de entrada."
        );
      }
    })
    .catch((error) => {
      console.error("Erro detalhado no login: ", error);
      let message = `Erro no login: ${error.message}`;
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        message = "E-mail ou senha incorretos. Por favor, tente novamente.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Erro de rede. Verifique sua conexão com a internet.";
      }
      showModal(message);
    });
});

// NOVA FUNÇÃO DE REDEFINIÇÃO DE SENHA
resetPasswordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value;

    auth.sendPasswordResetEmail(email)
        .then(() => {
            showModal("E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.");
            showSection(loginSection); // Volta para a tela de login
        })
        .catch((error) => {
            console.error("Erro ao enviar e-mail de redefinição:", error);
            let message = "Ocorreu um erro. Tente novamente.";
            if (error.code === "auth/user-not-found") {
                message = "Nenhum usuário encontrado com este endereço de e-mail.";
            }
            showModal(message);
        });
});