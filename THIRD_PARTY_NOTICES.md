# Avisos de terceiros

Este projeto inclui material de terceiros distribuído sob as licenças abaixo.
As dependências npm (React, Vite, SDK da Anthropic, etc.) não estão incluídas no
repositório; são instaladas com `npm install` e mantêm as suas próprias licenças.

---

## Feather Icons

- Projeto: https://github.com/feathericons/feather
- Onde é usado: `src/components/Icon.tsx`
- Utilização: vários ícones reproduzem a geometria SVG dos Feather Icons
  (confirmados como idênticos: `activity`, `code`, `zap`, `terminal`,
  `chevron-left`, `chevron-right`); os restantes foram desenhados no mesmo estilo
  de traço 24×24 e alguns são adaptações dos ícones Feather correspondentes.

```
The MIT License (MIT)

Copyright (c) 2013-2023 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Modelo create-vite (React + TypeScript)

- Projeto: https://github.com/vitejs/vite/tree/main/packages/create-vite
- Onde é usado: estrutura inicial do projeto (configuração `tsconfig*.json`,
  `vite.config.ts`, `.oxlintrc.json`). As imagens do modelo foram removidas;
  o favicon da app é `public/favicon-sds.svg`, criado para este projeto.
- Licença: MIT — Copyright (c) 2019-present, VoidZero Inc. and Vite contributors.
  O texto completo da licença MIT é igual ao reproduzido acima, com este aviso de
  copyright: https://github.com/vitejs/vite/blob/main/packages/create-vite/LICENSE
