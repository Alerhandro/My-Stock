// ATENÇÃO: As credenciais agora são carregadas de forma segura!
const firebaseConfig = {
  apiKey: window.env.apiKey,
  authDomain: window.env.authDomain,
  projectId: window.env.projectId,
  storageBucket: window.env.storageBucket,
  messagingSenderId: window.env.messagingSenderId,
  appId: window.env.appId,
};

// Inicializa o Firebase, tornando o objeto 'firebase' globalmente disponível
firebase.initializeApp(firebaseConfig);
