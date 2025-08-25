const auth = firebase.auth();
const db = firebase.firestore();
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterLink = document.getElementById("show-register");
const showLoginLink = document.getElementById("show-login");
const alertModal = document.getElementById("alert-modal");
const modalMessage = document.getElementById("modal-message");
const modalOkButton = document.getElementById("modal-ok-button");
const closeModalButton = document.querySelector(".close-button");

function showModal(message) {
  modalMessage.textContent = message;
  alertModal.style.display = "flex";
}
function closeModal() {
  alertModal.style.display = "none";
}
modalOkButton.addEventListener("click", closeModal);
closeModalButton.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
  if (e.target == alertModal) closeModal();
});

showRegisterLink.addEventListener("click", () => {
  loginSection.style.display = "none";
  registerSection.style.display = "block";
});
showLoginLink.addEventListener("click", () => {
  registerSection.style.display = "none";
  loginSection.style.display = "block";
});

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
    showLoginLink.click();
  } catch (error) {
    console.error("Erro detalhado no registo: ", error);
    let message = `Erro no registo: ${error.message}`; // Mensagem padrão

    // Personaliza a mensagem para o erro de e-mail já existente
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
