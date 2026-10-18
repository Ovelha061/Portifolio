# CLAUDE.md - Diretrizes do Projeto Web OS Portfolio

Este arquivo serve como contexto e guia de desenvolvimento para o Claude e outros assistentes de IA neste repositório.

---

## 📌 Visão Geral do Projeto

Portfólio interativo de alta fidelidade desenvolvido como um **Web OS (Sistema Operacional no Navegador)** com temática moderna *Dark Glassmorphism* (estilo macOS/Linux).

- **Autor:** Iago M.
- **GitHub:** [OvelhaNegra111](https://github.com/OvelhaNegra111)
- **WhatsApp:** `+55 (61) 99698-7885`
- **Email:** `iagomaniglia@gmail.com`

---

## 🛠️ Stack Tecnológica & Princípios de Arquitetura

O projeto adota uma abordagem estrita de **Zero Build Tools / Vanilla Web**:
1. **HTML5 Semântico:** Estrutura declarativa de janelas, dock, desktop e menus.
2. **CSS3 Puro:** Glassmorphism (`backdrop-filter: blur`), gradientes em malha (*mesh glow*), variáveis CSS para temas e design 100% responsivo.
3. **Vanilla JavaScript (ES6+):** Padrão de objeto único global `AppOS` encapsulado em IIFE.
4. **Web Audio API:** Síntese de áudio procedural em tempo real para efeitos sonoros táteis (sem arquivos de áudio externos).
5. **Lucide Icons:** Biblioteca de ícones carregada via CDN (`lucide.createIcons()`).

> ⚠️ **IMPORTANTE:** Nunca adicione frameworks pesados (React, Vue, Tailwind, Webpack/Vite) a menos que explicitamente solicitado pelo usuário. O projeto deve sempre funcionar com duplo clique no `index.html`.

---

## 📁 Estrutura de Arquivos

```
meu_portfolio/
├── index.html       # Estrutura completa: Área de trabalho, Dock, Topbar e todas as Janelas
├── style.css        # Sistema de design, Glassmorphism, temas dinâmicos e responsividade
├── app.js           # Gerenciador de janelas, CLI do Terminal, sintetizador de som e eventos
├── README.md        # Documentação e instruções de deploy para GitHub Pages
└── CLAUDE.md        # Diretrizes e contexto de IA para este projeto
```

---

## 🧠 Componentes Principais (`app.js` & `index.html`)

### 1. Window Manager (`AppOS`)
- **Abertura/Foco:** `AppOS.openWindow(appId)` traz a janela para frente incrementando `activeZIndex`.
- **Controles macOS:** Fechar (`.win-close`), Minimizar (`.win-minimize`), Maximizar/Restaurar (`.win-maximize`).
- **Arrasto (Drag & Drop):** Implementado no cabeçalho das janelas com detecção de limites da tela (*viewport boundaries*).

### 2. Terminal CLI (`commands`)
- Suporte a comandos: `help`, `about`, `skills`, `projects`, `contact`, `theme`, `audio`, `clear`, `matrix`, `github`.
- Histórico de navegação com as setas para cima/baixo (↑ / ↓).
- Autocomplete com tecla `Tab`.
- Integração com a API pública do GitHub (`https://api.github.com/users/OvelhaNegra111`).

### 3. Síntese Sonora (`playSound`)
- Utiliza `AudioContext` nativo do navegador para sintetizar ondas sonoras senoidais e harmônicas para:
  - `'click'`: feedback rápido ao pressionar botões.
  - `'open'`: abertura suave de janelas.
  - `'close'`: fechamento.
  - `'error'`: erro no terminal ou campos vazios.

### 4. Sistema de Temas
- Classes aplicadas ao `#wallpaper-container` (via `AppOS.setTheme`):
  - `wallpaper-aurora` (Padrão: Violeta & Magenta)
  - `wallpaper-midnight` (Azul escuro espacial)
  - `wallpaper-cyber` (Ciano & Neon)
  - `wallpaper-minimal` (Cinza minimalista e sóbrio)
- Classe `no-blur` no `<body>` desativa o `backdrop-filter` (opção "Backdrop Blur" em Preferências).

---

## 🚀 Como Executar e Testar

Como não há etapa de compilação, qualquer uma das opções abaixo funciona:

- **Direto pelo Navegador:** Duplo clique no arquivo `index.html`.
- **Servidor HTTP Local (PowerShell / Python):**
  ```powershell
  python -m http.server 3000
  ```
- **Extensão Live Server:** Clicar com botão direito em `index.html` > "Open with Live Server".

---

## 📝 Regras para Fazer Modificações

1. **Ao Adicionar um Novo Projeto:**
   - Adicione o `<article class="project-card">` na `.projects-grid` em `index.html`.
   - Adicione os detalhes correspondentes no comando `projects` do terminal em `app.js`.
2. **Ao Criar uma Nova Janela:**
   - Crie a estrutura `<div class="os-window glass" id="win-[nome]" data-window="[nome]">` dentro de `#windows-container` em `index.html`, com o título igual ao `label`.
   - Registre o app em `APPS` (`app.js`) com `label`, `icon`, `color` e `cat`. O Dock, a área de trabalho, os menus do Top Bar, o Spotlight e o comando `open` são gerados a partir desse registro, então **não** adicione atalhos ou itens de Dock no HTML.

### Arquitetura da Informação (registro `APPS` em `app.js`)
- **Organização:** categorias em `CATEGORIES`, na ordem da jornada do visitante: Portfólio → Perfil → Contato → Extras → Sistema.
- **Rotulagem:** um único `label` por app, usado em todos os lugares (sem extensões tipo `.exe`/`.pdf`, sempre em português). Links externos levam `↗`.
- **Navegação:** o Dock é separado por categoria; o Top Bar tem um menu por categoria; o menu do sistema e o de contexto trazem os atalhos de sistema.
- **Busca:** o Spotlight (Ctrl/Cmd + K, lupa ou botão direito → Buscar) agrupa os resultados por categoria e encontra pelo `label`, pelas `keys` (sinônimos) e pelo nome da categoria. Links externos (GitHub, Email, WhatsApp) ficam em `LINKS`.
3. **Consistência Visual:**
   - Sempre use variáveis CSS (`var(--bg-glass)`, `var(--accent-primary)`, etc.).
   - Sempre chame `lucide.createIcons()` após injetar novos elementos com atributos `data-lucide`.
