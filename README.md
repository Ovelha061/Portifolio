# Portfólio Web OS

Portfólio interativo em formato de sistema operacional no navegador, com estética Dark Glassmorphism.

## Stack

- HTML5 semântico
- CSS3 puro (variáveis CSS, `backdrop-filter`, responsividade)
- JavaScript ES6+ (Vanilla, sem frameworks ou build tools)
- Web Audio API (sons sintetizados, sem arquivos de áudio)
- [Lucide Icons](https://lucide.dev) via CDN

## Como executar

Não há etapa de compilação. Use uma das opções:

- **Navegador:** dê duplo clique em `index.html`.
- **Servidor local (PowerShell / Python):**
  ```powershell
  python -m http.server 3000
  ```
  Depois acesse `http://localhost:3000`.
- **Live Server (VS Code):** clique com o botão direito em `index.html` > "Open with Live Server".

## Deploy no GitHub Pages

1. Envie os arquivos para um repositório no GitHub.
2. Vá em **Settings > Pages**.
3. Em **Source**, selecione a branch principal e a pasta `/ (root)`.
4. Salve. O site ficará disponível em `https://<usuario>.github.io/<repositorio>/`.

## Estrutura

```
meu_portfolio/
├── index.html   # Área de trabalho, dock, topbar e janelas
├── style.css    # Design system, glassmorphism, temas e responsividade
├── app.js       # Gerenciador de janelas, terminal CLI, sons e eventos
├── README.md    # Este arquivo
└── CLAUDE.md    # Diretrizes de desenvolvimento
```

## Terminal

Comandos disponíveis: `help`, `about`, `skills`, `projects`, `contact`, `github`, `theme <cor>`, `audio <on|off>`, `open <app>`, `clear`, `matrix`, `sudo`.

## Autor

Ovelha061 · [GitHub](https://github.com/OvelhaNegra111)
