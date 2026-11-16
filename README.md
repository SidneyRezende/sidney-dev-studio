# SIDNEY DEV STUDIO

Painel pessoal para **desenvolvimento, produção de vídeo para YouTube, automação e
inteligência artificial**, feito com React, TypeScript e Vite.

Foi pensado para correr bem num computador modesto (testado num Intel Celeron com
4 GB de RAM): sem base de dados, sem bibliotecas de interface e com cada área
carregada apenas quando é aberta.

> Os dados ficam no navegador do próprio utilizador (`localStorage`). A app não tem
> contas, não envia telemetria e não comunica com nenhum serviço externo — exceto,
> opcionalmente, a API da Anthropic através de um servidor **local** (ver abaixo).

---

## Funcionalidades

| Área | O que faz |
|---|---|
| **Dashboard** | Indicadores calculados a partir dos projetos, filtros *Recentes / Ativos / Concluídos / Todos*, criar, editar e eliminar projetos (com confirmação). |
| **Desenvolvimento** | Tecnologias de cada projeto, botão *Copiar comando VS Code* (`code "pasta"`) e importação de projetos a partir de uma pasta escolhida no navegador (só leitura). |
| **YouTube** | Quadro de produção *Ideia → Roteiro → Gravação → Edição → Publicado*, contadores com os limites do YouTube, roteiro com estimativa de duração e banco de ideias. |
| **Automação** | Catálogo de scripts Python e PowerShell, consulta só de leitura (inclui ficheiros UTF-16) e *Copiar comando*. **A app nunca executa scripts.** |
| **Inteligência Artificial** | Biblioteca de prompts com variáveis `{assim}`, preenchimento a partir de vídeos do quadro, *Copiar prompt* e — com o servidor local — *Gerar com IA*. |
| **Dados locais** | Exportar e importar backup em JSON, validação de dados, migração automática e cópia de segurança antes de qualquer migração. |

---

## Requisitos

- **Node.js 24 ou superior** (desenvolvido e testado com Node.js 26 LTS).
- Um navegador moderno. A importação de pastas usa a *File System Access API*,
  disponível no **Microsoft Edge** e no **Google Chrome**.
- Opcional: uma chave da API Anthropic, para gerar texto diretamente na app.

---

## Instalação

```bash
git clone <url-deste-repositório>
cd <pasta-do-repositório>
npm install
```

> **Windows (PowerShell):** se o PowerShell bloquear o comando `npm`, use `npm.cmd`
> (por exemplo `npm.cmd install`). Não é preciso alterar políticas do sistema.

## Utilização

```bash
npm run dev       # servidor de desenvolvimento → http://localhost:5173
npm run build     # verifica tipos e compila para produção (pasta dist/)
npm run preview   # serve a versão compilada → http://localhost:4173
npm run lint      # verificação de código (oxlint)
npm run ia        # servidor local de IA (opcional, ver abaixo)
```

---

## Servidor local de IA (opcional)

Sem este servidor, a área de IA funciona em modo **copiar e colar**: preenche o
prompt e copia-o para o serviço de IA que preferir.

Com o servidor, o botão **Gerar com IA** envia o prompt para a API da Anthropic
através do seu computador:

```
Navegador (app) ──▶ servidor local 127.0.0.1:8787 ──▶ API Anthropic
                     (lê a chave do ficheiro .env)
```

### Configuração

1. Copie o modelo de configuração:
   ```bash
   cp .env.example .env            # Windows: Copy-Item .env.example .env
   ```
2. Edite o `.env` e preencha `ANTHROPIC_API_KEY=` com a sua chave.
3. Inicie o servidor num terminal e a app noutro:
   ```bash
   npm run ia
   npm run dev
   ```

### Opções do `.env`

| Variável | Por omissão | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Chave da API (obrigatória para gerar texto). |
| `IA_MODELO` | `claude-opus-5-5` | Modelo usado pelo servidor. |
| `IA_SERVIDOR_PORTA` | `8787` | Porta do servidor (a app espera 8787). |
| `IA_ORIGENS` | `http://localhost:5173,http://localhost:4173` | Origens da app autorizadas. |
| `IA_MAX_POR_MINUTO` | `10` | Limite local de pedidos por minuto. |
| `IA_FALLBACK` | `desligado` | `ligado` ativa o fallback automático da Anthropic (se o modelo recusar um pedido, tenta outro modelo; pode ter custo extra). |

> Cada pedido feito com **Gerar com IA** é cobrado na sua conta Anthropic.

---

## Segurança e privacidade

- **A chave API nunca chega ao navegador.** Fica apenas no `.env`, que está no
  `.gitignore`, e é usada só pelo servidor local através do SDK oficial
  [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript).
  Não é escrita em registos nem devolvida em respostas.
- **Nunca use o prefixo `VITE_`** em variáveis com segredos: o Vite inclui essas
  variáveis no código enviado ao navegador.
- O servidor local:
  - escuta apenas em `127.0.0.1` (não é acessível a partir da rede);
  - aceita pedidos de navegador só das origens configuradas e verifica o cabeçalho
    `Host` (proteção contra *DNS rebinding*);
  - limita o tamanho dos pedidos, processa um pedido de cada vez e aplica um
    limite por minuto.
- **Limitação conhecida:** o servidor não tem autenticação própria. Enquanto
  estiver ligado, outros programas **do mesmo computador** podem usá-lo. Desligue-o
  (`Ctrl+C`) quando não estiver a usar a IA.
- A app recusa guardar textos que pareçam chaves API (por exemplo `sk-…`) nos
  campos de fornecedores e prompts, e recusa importar backups que as contenham.
- A leitura de pastas e ficheiros só acontece quando o utilizador os escolhe na
  janela do navegador, apenas com permissão de leitura.
- Eliminar projetos, vídeos, ideias ou scripts remove apenas o registo na app —
  **nunca apaga ficheiros do disco**.

---

## Estrutura do projeto

```
├── server/
│   └── ia-servidor.ts        # servidor local de IA (Node.js, sem compilação)
├── src/
│   ├── components/           # interface (dashboard, áreas, diálogos)
│   │   ├── automacao/        # catálogo de scripts
│   │   ├── ia/               # fornecedores e prompts
│   │   └── youtube/          # quadro de produção e ideias
│   ├── services/ai.ts        # cliente do servidor local de IA
│   ├── store/                # dados, validação e persistência (localStorage)
│   ├── utils/                # caminhos, datas, pastas, tecnologias
│   ├── data.ts               # tipos e dados de exemplo
│   └── App.tsx
├── .env.example              # modelo de configuração (sem valores)
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

## Tecnologias

React 19 · TypeScript · Vite · Oxlint · Node.js (`http` nativo) · SDK oficial da Anthropic.
Sem bibliotecas de interface, de estado ou de base de dados.

---

## Licença

Distribuído sob a licença **MIT** — ver [`LICENSE`](LICENSE).

Inclui material de terceiros (ícones baseados nos **Feather Icons**, MIT, © Cole
Bemis, e o modelo **create-vite**, MIT) — ver
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
