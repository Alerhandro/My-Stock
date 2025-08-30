# Despensa - Gerenciador de Estoque Doméstico

![Logo do Despensa](src/assets/logof.png)

Um aplicativo de desktop simples e eficiente para gerenciar os itens da sua despensa, construído com Electron e Firebase.

# Recursos Principais

-   **Autenticação de Usuários**: Sistema seguro de login e registo com verificação de e-mail.
-   **Gestão de Múltiplas Despensas**: Crie e gerencie várias despensas para diferentes locais (ex: Cozinha, Lavandaria).
-   **Controle de Produtos**: Adicione, edite, e remova produtos facilmente. Acompanhe a quantidade, valor unitário e defina um estoque mínimo.
-   **Alertas de Estoque Baixo**: Receba notificações visuais na tela inicial para produtos que estão acabando.
-   **Colaboração em Tempo Real**: Convide amigos ou familiares para partilhar e gerir uma despensa em conjunto.
-   **Histórico de Movimentações**: Visualize um relatório completo de todas as entradas, saídas e ajustes de produtos.
-   **Exportação para PDF**: Gere e imprima relatórios de movimentação e listas de compras em formato PDF.
-   **Personalização de Tema**: Escolha entre vários temas de cores para personalizar a aparência do aplicativo.

# Tecnologias Utilizadas

-   **Framework**: [Electron](https://www.electronjs.org/)
-   **Frontend**: HTML5, CSS3, JavaScript (ES6 Modules)
-   **Base de Dados**: [Cloud Firestore (Firebase)](https://firebase.google.com/docs/firestore)
-   **Autenticação**: [Firebase Authentication](https://firebase.google.com/docs/auth)
-   **Empacotamento**: [electron-builder](https://www.electron.build/)
-   **Atualizações Automáticas**: [electron-updater](https://www.electron.build/auto-update)
-   **Geração de PDF**: [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https.github.com/simonbengtsson/jsPDF-AutoTable)

# Como Começar

Estas são as instruções para configurar e executar o projeto localmente para desenvolvimento.

# Pré-requisitos

-   [Node.js](https://nodejs.org/) (versão 14 ou superior recomendada)
-   [npm](https://www.npmjs.com/) (geralmente vem com o Node.js)

# Instalação

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/Alerhandro/My-Stock.git]
    cd seu-repositorio
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configuração do Firebase:**
    Crie um ficheiro `.env` na raiz do projeto (no mesmo nível do `package.json`) e adicione as suas credenciais do Firebase:
    ```
    API_KEY="SUA_API_KEY"
    AUTH_DOMAIN="SEU_AUTH_DOMAIN"
    PROJECT_ID="SEU_PROJECT_ID"
    STORAGE_BUCKET="SEU_STORAGE_BUCKET"
    MESSAGING_SENDER_ID="SEU_SENDER_ID"
    APP_ID="SEU_APP_ID"
    ```
    *Estas credenciais são obtidas no console do seu projeto Firebase.*

4.  **Execute a aplicação em modo de desenvolvimento:**
    ```bash
    npm start
    ```

# Compilação

Para compilar a aplicação para a sua plataforma (Windows, macOS, Linux), utilize o comando:
```bash
npm run build
```
O instalador será gerado na pasta `release/`.

# Estrutura do Projeto

O projeto está organizado da seguinte forma:

```
Despensa/
├── src/
│   ├── assets/       # Imagens e ícones
│   ├── pages/        # Ficheiros HTML (telas)
│   │   ├── home.html
│   │   └── login.html
│   ├── scripts/
│   │   ├── modules/  # Módulos JS reutilizáveis
│   │   │   ├── firestore.js
│   │   │   ├── pages.js
│   │   │   ├── state.js
│   │   │   └── ui.js
│   │   ├── home.js      # Lógica da tela principal
│   │   └── login.js     # Lógica da tela de login
│   ├── styles/       # Ficheiros CSS
│   │   ├── globals.css
│   │   ├── home.css
│   │   └── login.css
│   ├── firebaseConfig.js # Configuração do Firebase
│   ├── main.js           # Processo principal do Electron
│   └── preload.js        # Script de pré-carregamento do Electron
├── .env                  # Variáveis de ambiente (credenciais)
├── .gitignore            # Ficheiros ignorados pelo Git
├── package.json          # Metadados e dependências do projeto
└── package-lock.json     # Versões exatas das dependências
```
