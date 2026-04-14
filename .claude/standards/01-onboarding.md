# 01 — Bem-vindo à Bravy

**Leia antes de qualquer coisa.** Este documento é o seu ponto zero. Não importa se você é dev experiente ou se está programando pela primeira vez com uma LLM — passe por aqui antes de abrir o editor.

Ao final deste arquivo, você vai ter:
- A filosofia que guia tudo que fazemos
- Um glossário de ~40 termos que aparecem no dia a dia
- A stack completa com justificativa para cada escolha
- Seu ambiente de desenvolvimento rodando
- Um checklist do que fazer no primeiro dia

Bora.

---

## 1.1 — Filosofia de desenvolvimento da Bravy

Antes de falar de código, vamos falar de mentalidade. A Bravy é uma empresa que abraça vibecoding — usar LLMs para construir software mais rápido. Mas "mais rápido" não significa "de qualquer jeito".

### Velocidade com qualidade: vibecoding permite ambos

Vibecoding não é desculpa para código ruim. É exatamente o contrário: quando você tem uma LLM gerando código, você consegue ir rápido **e** manter qualidade. A LLM escreve o boilerplate, você foca nas decisões de arquitetura. A LLM formata o código, você garante que a lógica faz sentido. Não existe trade-off entre velocidade e qualidade aqui — a ferramenta elimina esse dilema.

### Padronização > velocidade

Se você tem duas opções — entregar em 2 horas fora do padrão ou em 4 horas dentro do padrão — **escolha as 4 horas**. Sempre. Código fora do padrão gera dívida técnica. Dívida técnica vira bug. Bug vira noite perdida. Noite perdida vira rotatividade. Seguir o padrão é o atalho de verdade.

### Se não está documentado, não existe

Decidiu algo em call? Documentou? Não? Então não foi decidido. Mudou o comportamento de uma API? Atualizou o doc? Não? Então a API anterior ainda vale. Nós documentamos tudo: decisões de arquitetura, padrões de nomenclatura, fluxos de autenticação, variáveis de ambiente. Se você está lendo este arquivo, é porque a gente pratica o que prega.

### LLM é ferramenta, não substituto de pensamento crítico

A LLM vai gerar código que compila, que roda, que parece certo. Mas "parece certo" não é "está certo". Você **precisa** entender o que está sendo gerado. Não aceite código que você não consegue explicar para outra pessoa. Se a LLM gerou algo e você não sabe por quê — pare, pergunte, entenda. O dia que você parar de questionar o output é o dia que você vira um aprovador de pull requests, não um engenheiro.

**Resumo prático:**

| Princípio | Na prática |
|-----------|-----------|
| Velocidade com qualidade | Use a LLM para ir rápido, mas revise tudo antes de commitar |
| Padronização > velocidade | Consulte o [03-nomenclatura-e-padroes.md](03-nomenclatura-e-padroes.md) antes de criar qualquer arquivo |
| Se não está documentado, não existe | Atualize docs quando mudar comportamento |
| LLM é ferramenta | Entenda cada linha que você coloca no repositório |

---

## 1.2 — Glossário técnico essencial

Se algum termo aparecer numa conversa, num PR review ou num doc e você não souber o que é — volte aqui. Esta tabela é sua cola oficial.

**Como ler:** cada termo tem o que é em 1-2 frases simples, uma analogia do mundo real para fixar, e onde ele aparece no projeto Bravy.

### Comunicação e transporte de dados

| Termo | O que é | Analogia do mundo real | Onde no projeto |
|-------|---------|----------------------|-----------------|
| **API** (Application Programming Interface) | Um contrato que define como dois sistemas se comunicam. Na prática, é um conjunto de URLs que aceitam requests e devolvem responses em JSON. | O cardápio do restaurante: você não vai na cozinha, pede pelo cardápio e recebe o prato pronto. | Backend NestJS (`src/modules/*/`) expõe a API. Frontend consome via `lib/api.ts`. |
| **Endpoint** | Uma URL específica da API que faz uma coisa específica. Ex: `GET /api/products` retorna a lista de produtos. | Uma porta específica no prédio. Cada porta leva a uma sala diferente. | Definidos nos controllers: `src/modules/products/products.controller.ts` |
| **DTO** (Data Transfer Object) | Um objeto que define exatamente quais campos uma request ou response deve ter. Serve para validação e tipagem. | O formulário do banco: só aceita os campos que estão ali, no formato certo. | `src/modules/*/dto/*.dto.ts` — um DTO por operação (create, update, response). |
| **CORS** (Cross-Origin Resource Sharing) | Uma política de segurança do navegador que controla quais domínios podem acessar sua API. Se o frontend está em `localhost:3000` e a API em `localhost:3001`, precisa liberar CORS. | O segurança do prédio que só deixa entrar quem está na lista. | Configurado em `src/main.ts` com `app.enableCors()`. |
| **Token JWT** (JSON Web Token) | Uma string codificada que o servidor gera quando o usuário faz login. Cada request subsequente envia esse token para provar que está autenticado. | O crachá da empresa. Você mostra na entrada e pode acessar as salas permitidas. | Gerado em `src/modules/auth/auth.service.ts`, validado pelo `JwtAuthGuard`. |
| **Hash** | O resultado de transformar uma string (como uma senha) num código irreversível. Você não consegue voltar do hash para a senha original, mas consegue comparar dois hashes. | Uma impressão digital: identifica unicamente, mas não dá para reconstruir a pessoa. | Senhas são hasheadas com bcrypt em `src/modules/auth/auth.service.ts`. |

### Arquitetura backend (NestJS)

| Termo | O que é | Analogia do mundo real | Onde no projeto |
|-------|---------|----------------------|-----------------|
| **Route** | O caminho (URL) que o usuário acessa. É a "porta de entrada" para uma funcionalidade. | O endereço de uma loja: Rua X, número Y. | Definidas com decorators `@Get()`, `@Post()`, etc. nos controllers. |
| **Controller** | A camada que recebe a request HTTP, extrai os dados e delega para o service. Não tem lógica de negócio — só roteia. | O atendente do balcão: recebe o pedido e passa para a cozinha. Não cozinha. | `src/modules/*/controllers/*.controller.ts` |
| **Service** | A camada que contém a lógica de negócio. Valida regras, calcula valores, decide o que fazer. É o cérebro da operação. | O chef de cozinha: decide a receita, manda preparar os ingredientes. | `src/modules/*/services/*.service.ts` |
| **Repository** | A camada que fala com o banco de dados. Executa queries (buscar, salvar, deletar). Não sabe regras de negócio — só persiste dados. | O estoquista: guarda e busca ingredientes. Não sabe a receita. | `src/modules/*/repositories/*.repository.ts` |
| **Module** | O pacote que agrupa controller + service + repository + tudo relacionado a uma funcionalidade. NestJS usa modules para organizar a aplicação. | O departamento da empresa: financeiro, RH, comercial. Cada um tem suas pessoas e responsabilidades. | `src/modules/*/module.ts` — cada feature é um module. |
| **Guard** | Um interceptador que roda **antes** do controller e decide se a request pode prosseguir. Usado para autenticação e autorização. | O segurança na porta da sala VIP: verifica se você tem crachá e permissão. | `src/common/guards/jwt-auth.guard.ts`, `src/common/guards/roles.guard.ts` |
| **Pipe** | Um transformador que roda antes do controller e pode validar ou transformar os dados da request. | O detector de metais do aeroporto: verifica se está tudo ok antes de deixar passar. | `ValidationPipe` global em `src/main.ts`. Pipes customizados em `src/common/pipes/`. |
| **Interceptor** | Um middleware que roda antes **e** depois do controller. Pode modificar a response, logar, medir tempo, etc. | Uma câmera de segurança que grava a entrada e a saída. | `src/common/interceptors/response.interceptor.ts` envelopa todas as responses. |
| **Filter** | Captura exceções que acontecem durante o processamento e transforma em responses padronizadas. | O seguro do carro: quando dá problema, garante que o resultado é controlado. | `src/common/filters/http-exception.filter.ts` |
| **Decorator** | Uma anotação (com `@`) que adiciona metadados ou comportamento a uma classe, método ou parâmetro. No NestJS, quase tudo é configurado via decorators. | Uma etiqueta colada num pacote: não muda o conteúdo, mas diz como tratar. | `@Controller()`, `@Get()`, `@Injectable()`, `@UseGuards()`, etc. |
| **Middleware** | Código que roda entre a request chegar e o controller processar. Pode modificar a request, logar, etc. | A recepção do prédio: registra quem entrou antes de subir para o andar. | `src/common/middleware/` — logging, rate limiting, etc. |

### Banco de dados

| Termo | O que é | Analogia do mundo real | Onde no projeto |
|-------|---------|----------------------|-----------------|
| **ORM (Prisma)** | Uma ferramenta que permite interagir com o banco de dados usando código TypeScript em vez de SQL puro. Prisma é o ORM que a Bravy usa. | O Google Tradutor entre TypeScript e SQL. Você fala TypeScript, ele converte para SQL. | `prisma/schema.prisma` (definição), `src/database/prisma.service.ts` (conexão). |
| **Migration** | Um script versionado que altera a estrutura do banco (criar tabela, adicionar coluna, etc.). Migrations são executadas em ordem e podem ser revertidas. | Uma reforma na casa: cada etapa é documentada e pode ser desfeita. | `prisma/migrations/` — geradas pelo `prisma migrate dev`. |
| **Schema** | A definição da estrutura do banco de dados: quais tabelas existem, quais colunas, quais tipos, quais relações. | A planta do prédio: mostra todos os andares, salas e conexões. | `prisma/schema.prisma` — a fonte de verdade. |
| **Model** | Uma representação de uma tabela do banco no código. No Prisma, cada model no schema vira uma tabela no PostgreSQL. | Uma ficha de cadastro: define quais informações aquela entidade tem. | Cada `model` em `prisma/schema.prisma` (ex: `model User`, `model Product`). |
| **Seed** | Um script que popula o banco com dados iniciais (usuário admin, categorias padrão, etc.). Roda depois das migrations. | Os móveis que já vêm no apartamento decorado: o básico para funcionar. | `prisma/seed.ts` — executado com `prisma db seed`. |
| **Enum** | Uma lista fixa de valores possíveis para um campo. Ex: `Role` pode ser `ADMIN`, `USER`, `MANAGER`. | Um menu dropdown: só pode escolher o que está ali. | Definidos em `prisma/schema.prisma` como `enum Role { ... }`. |
| **SQL Injection** | Um ataque onde o invasor insere código SQL malicioso através de inputs do usuário. O Prisma previne isso automaticamente usando queries parametrizadas. | Alguém ditando o próprio pedido diretamente para o cozinheiro, bypassing o garçom. | Prisma cuida disso. Nunca use `$queryRawUnsafe` com input do usuário. |

### Frontend (Next.js / React)

| Termo | O que é | Analogia do mundo real | Onde no projeto |
|-------|---------|----------------------|-----------------|
| **Component** | Um pedaço reutilizável de UI. Pode ser um botão, um formulário, uma página inteira. React é baseado em componentes. | Um bloco de LEGO: encaixa em vários lugares, sempre funciona igual. | `src/components/` (compartilhados), `src/features/*/components/` (específicos). |
| **Hook** | Uma função especial do React que permite usar estado, efeitos colaterais e outras features em componentes funcionais. Começa com `use`. | Uma tomada na parede: conecta seu componente a uma fonte de energia (dados, estado, etc.). | `src/hooks/` (globais), `src/features/*/hooks/` (por feature). |
| **Provider** | Um componente que "embrulha" outros componentes e fornece dados ou funcionalidades para todos os filhos. Usa o padrão Context do React. | O Wi-Fi do escritório: cobre uma área e todos dentro dela podem usar. | `src/providers/auth-provider.tsx`, `src/providers/query-provider.tsx`. |
| **Store** | Um local centralizado para armazenar estado global da aplicação. Usado para dados que precisam ser acessados em muitos componentes. | O quadro de avisos do escritório: todo mundo pode ler e atualizar. | `src/stores/` — usando Zustand ou similar. |
| **Context** | O mecanismo nativo do React para compartilhar dados entre componentes sem passar props manualmente em cada nível. | Um grupo de WhatsApp: todo mundo no grupo recebe a mensagem, sem precisar encaminhar um por um. | Usado dentro dos providers em `src/providers/`. |
| **Server Component** | Um componente React que roda **no servidor**. Pode acessar o banco diretamente, não envia JavaScript para o navegador. É o padrão no Next.js App Router. | Uma comida preparada na cozinha do restaurante: o cliente recebe o prato pronto, não vê a preparação. | Qualquer componente em `src/app/` que **não** tem `'use client'` no topo. |
| **Client Component** | Um componente React que roda **no navegador**. Precisa da diretiva `'use client'` no topo. Necessário para interatividade (clicks, forms, estado). | Uma estação self-service: o cliente interage diretamente. | Componentes com `'use client'` — forms, modais, componentes interativos. |
| **Server Action** | Uma função assíncrona que roda no servidor mas pode ser chamada diretamente de um componente client. Simplifica mutações de dados. | Um pedido pelo interfone: você fala do apartamento e a portaria resolve. | Definidas com `'use server'` em `src/app/actions/` ou inline. |
| **SSR** (Server-Side Rendering) | A página é renderizada no servidor a cada request. O usuário recebe HTML pronto. | Um prato feito sob encomenda: preparado na hora, para cada cliente. | Padrão do App Router com Server Components. |
| **SSG** (Static Site Generation) | A página é gerada uma vez no build e servida como HTML estático. Ideal para conteúdo que não muda. | Um cardápio impresso: feito uma vez, distribuído para todos. | Páginas com `generateStaticParams()` no App Router. |
| **ISR** (Incremental Static Regeneration) | Combina SSG com revalidação periódica. A página é estática, mas atualiza automaticamente de tempos em tempos. | Um cardápio que é reimpresso todo dia com os novos pratos. | Configurado com `revalidate` em `fetch()` ou segmentos de rota. |

### Segurança

| Termo | O que é | Analogia do mundo real | Onde no projeto |
|-------|---------|----------------------|-----------------|
| **CSRF** (Cross-Site Request Forgery) | Um ataque onde um site malicioso faz requests em nome do usuário autenticado. Mitigado com tokens anti-CSRF. | Alguém falsificando sua assinatura para autorizar uma transferência. | Mitigado pelo uso de JWT em header (não cookies) e SameSite policies. |
| **XSS** (Cross-Site Scripting) | Um ataque onde código JavaScript malicioso é injetado na página. O React previne a maioria dos casos automaticamente. | Alguém colando um cartaz falso no mural da empresa. | React escapa HTML por padrão. Nunca use `dangerouslySetInnerHTML` com input do usuário. |
| **Environment Variable** | Um valor de configuração armazenado fora do código (ex: senha do banco, chave de API). Nunca vai para o repositório. | O cofre da empresa: informações sensíveis ficam ali, não no mural. | `.env` (backend), `.env.local` (frontend). Modelo em `.env.example`. |

### DevOps e versionamento

| Termo | O que é | Analogia do mundo real | Onde no projeto |
|-------|---------|----------------------|-----------------|
| **Docker Container** | Uma instância em execução de uma imagem Docker. Isola a aplicação com todas as dependências, garantindo que roda igual em qualquer máquina. | Uma marmita completa: tudo que precisa está ali dentro, funciona em qualquer mesa. | `docker-compose.yml` sobe os containers (API, banco, etc.). |
| **Docker Image** | O "template" a partir do qual containers são criados. Contém o código, dependências e configurações. | A receita da marmita: a partir dela, você faz quantas marmitas quiser, todas iguais. | `Dockerfile` no root de cada repositório define a imagem. |
| **Docker Volume** | Um mecanismo para persistir dados de containers. Sem volume, os dados do banco seriam perdidos quando o container parasse. | O pen drive conectado na marmita: os dados sobrevivem mesmo se a marmita for descartada. | Definido em `docker-compose.yml` para o PostgreSQL. |
| **CI/CD** (Continuous Integration / Continuous Deployment) | Automação que roda testes, lint e deploy automaticamente quando você faz push. CI verifica qualidade; CD faz deploy. | A esteira da fábrica: cada etapa é automática — montagem, inspeção, empacotamento. | GitHub Actions (`.github/workflows/`). |
| **PR** (Pull Request) | Uma solicitação para mergear o código da sua branch na branch principal. Outros devs revisam antes de aprovar. | Pedir para o chefe assinar um documento antes de enviar para o cliente. | Via GitHub. Veja [09-git-workflow.md](09-git-workflow.md). |
| **Branch** | Uma linha de desenvolvimento paralela. Você trabalha na sua branch sem afetar o código principal até fazer merge. | Uma cópia do documento para rascunho: edita à vontade sem estragar o original. | Padrão: `feature/`, `fix/`, `hotfix/`. Detalhes em [09-git-workflow.md](09-git-workflow.md). |
| **Merge** | Combinar o código de uma branch com outra. Junta as mudanças feitas em paralelo. | Juntar dois rascunhos num documento final. | Via PR no GitHub, após code review. |
| **Rebase** | Reescrever o histórico de commits da sua branch para que ela pareça ter sido criada a partir do ponto mais recente da branch principal. Resulta num histórico linear. | Reescrever seu rascunho já incorporando as últimas mudanças do documento principal, como se você tivesse começado de lá. | `git rebase main` antes de abrir PR. Mantém histórico limpo. |

---

## 1.3 — A Stack Bravy

Cada tecnologia está aqui por um motivo. A tabela abaixo explica o que cada uma faz, por que a escolhemos, o que ela substitui, e onde achar a documentação oficial.

| Tecnologia | Papel | Por quê? | O que substitui | Link oficial |
|-----------|-------|----------|----------------|-------------|
| **TypeScript** | Linguagem principal (front e back) | Tipagem estática elimina categorias inteiras de bugs. Autocomplete funciona de verdade. LLMs geram TypeScript com muito mais precisão do que JavaScript puro. | JavaScript puro | [typescriptlang.org](https://www.typescriptlang.org/) |
| **NestJS** | Framework backend | Estrutura opinada com módulos, injeção de dependência e decorators. Força organização desde o primeiro dia. Perfeito para LLMs porque a arquitetura é previsível. | Express puro, Fastify puro, Koa | [nestjs.com](https://nestjs.com/) |
| **Next.js (App Router)** | Framework frontend | SSR, SSG e ISR nativos. App Router com Server Components reduz JavaScript no client. File-based routing é intuitivo. Ecossistema Vercel é robusto. | Create React App, Vite + React Router, Remix | [nextjs.org](https://nextjs.org/) |
| **PostgreSQL** | Banco de dados relacional | O banco open-source mais robusto que existe. Suporta JSON, full-text search, extensions. Comunidade gigante, material abundante. | MySQL, SQLite, MongoDB | [postgresql.org](https://www.postgresql.org/) |
| **Prisma** | ORM (Object-Relational Mapping) | Schema declarativo como fonte de verdade. Migrations automáticas. Type safety end-to-end com TypeScript. DX (developer experience) inigualável. | TypeORM, Sequelize, Knex, Drizzle | [prisma.io](https://www.prisma.io/) |
| **Tailwind CSS** | Estilização | Utility-first elimina conflitos de CSS. Não precisa inventar nomes de classes. Design system built-in. LLMs geram Tailwind com altíssima precisão. | CSS Modules, Styled Components, Sass | [tailwindcss.com](https://tailwindcss.com/) |
| **shadcn/ui** | Componentes de UI | Componentes copiados para o projeto (não é dependência). Acessíveis, bonitos, customizáveis. Baseados em Radix UI. Funcionam nativamente com Tailwind. | Material UI, Chakra UI, Ant Design | [ui.shadcn.com](https://ui.shadcn.com/) |
| **Docker** | Containerização | "Funciona na minha máquina" deixa de ser problema. Ambiente idêntico em dev, staging e produção. Sobe o banco local sem instalar nada. | Instalar tudo direto no sistema operacional | [docker.com](https://www.docker.com/) |
| **JWT** (JSON Web Token) | Autenticação | Stateless: o servidor não precisa guardar sessão. Perfeito para APIs REST. Contém informações do usuário dentro do token. | Session cookies, OAuth puro, Basic Auth | [jwt.io](https://jwt.io/) |

---

## 1.4 — Setup do ambiente (passo a passo)

Funciona em **macOS** e **Linux**. Windows funciona via WSL2 (mas se pode, use Mac ou Linux).

### Passo 1 — Instalar Node.js 20+ via nvm

O `nvm` (Node Version Manager) permite instalar e alternar entre versões do Node.js sem conflito.

```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Recarregar o terminal (ou feche e abra de novo)
source ~/.zshrc    # macOS (zsh)
source ~/.bashrc   # Linux (bash)

# Instalar Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verificar instalação
node --version   # deve mostrar v20.x.x
npm --version    # deve mostrar 10.x.x
```

**Por que nvm?** Porque projetos diferentes podem precisar de versões diferentes do Node. O nvm resolve isso sem dor de cabeça.

### Passo 2 — Instalar Docker Desktop

```bash
# macOS — via Homebrew
brew install --cask docker

# Linux (Ubuntu/Debian) — via apt
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER  # para não precisar de sudo
# Faça logout e login para o grupo docker funcionar
```

Depois de instalar, abra o Docker Desktop (macOS) ou verifique:

```bash
docker --version       # Docker version 27.x.x
docker compose version # Docker Compose version v2.x.x
```

### Passo 3 — Instalar e configurar Git

```bash
# macOS — já vem instalado. Atualize via Homebrew:
brew install git

# Linux (Ubuntu/Debian)
sudo apt install git

# Configurar identidade
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@bravy.com.br"

# Configurar editor padrão
git config --global core.editor "code --wait"  # VS Code
# ou
git config --global core.editor "cursor --wait"  # Cursor

# Verificar
git --version   # git version 2.x.x
git config --list
```

### Passo 4 — Configurar VS Code ou Cursor

O Cursor é um fork do VS Code com IA integrada. As extensões são as mesmas.

```bash
# macOS — instalar Cursor via Homebrew
brew install --cask cursor

# Ou baixe direto: https://cursor.com
```

Veja a lista completa de extensões na seção [1.5](#15--extensões-obrigatórias-do-vs-code--cursor).

### Passo 5 — Configurar Claude Code / LLM

Se está usando Cursor, a IA já vem integrada. Para usar Claude Code especificamente:

```bash
# Instalar Claude Code (via npm)
npm install -g @anthropic-ai/claude-code

# Verificar instalação
claude --version

# Fazer login (será aberta uma janela no navegador)
claude auth login
```

No Cursor, configure o modelo preferido em **Settings > Models**. A Bravy recomenda usar Claude como modelo principal.

### Passo 6 — Clonar repositório de exemplo

```bash
# Criar diretório de projetos (se não existir)
mkdir -p ~/www/bravy && cd ~/www/bravy

# Clonar o backend
git clone git@github.com:bravy/bravy-example-api.git
cd bravy-example-api

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Voltar e clonar o frontend
cd ..
git clone git@github.com:bravy/bravy-example-web.git
cd bravy-example-web

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env.local
```

### Passo 7 — Subir tudo com Docker Compose

```bash
# Voltar para o backend (o docker-compose.yml fica lá)
cd ~/www/bravy/bravy-example-api

# Subir o banco de dados e serviços auxiliares
docker compose up -d

# Verificar se subiu
docker compose ps
# Deve mostrar: postgres (running), redis (running), etc.

# Rodar migrations do Prisma
npx prisma migrate dev

# Rodar seed (dados iniciais)
npx prisma db seed

# Iniciar o backend
npm run start:dev
# Deve mostrar: "Application is running on: http://localhost:3001"
```

Em outro terminal:

```bash
# Iniciar o frontend
cd ~/www/bravy/bravy-example-web
npm run dev
# Deve mostrar: "Ready on http://localhost:3000"
```

### Passo 8 — Testar endpoint no navegador

1. Abra o navegador em `http://localhost:3000` — você deve ver a tela de login.
2. Teste a API diretamente: acesse `http://localhost:3001/api/health` — deve retornar:

```json
{
  "data": {
    "status": "ok",
    "timestamp": "2025-01-15T10:30:00.000Z"
  },
  "meta": {}
}
```

3. Se tudo funcionou: **parabéns, seu ambiente está pronto.**
4. Se algo deu errado: verifique se o Docker está rodando (`docker compose ps`), se as portas 3000 e 3001 estão livres, e se o `.env` foi criado corretamente.

---

## 1.5 — Extensões obrigatórias do VS Code / Cursor

Instale **todas** antes de começar a codar. Sem exceção.

| Extensão | ID | O que faz |
|----------|-----|----------|
| **ESLint** | `dbaeumer.vscode-eslint` | Analisa o código em tempo real e mostra erros de lint. Garante que o código segue as regras do projeto. |
| **Prettier** | `esbenp.prettier-vscode` | Formata o código automaticamente ao salvar. Tabs, aspas, ponto-e-vírgula — tudo padronizado sem esforço. |
| **Tailwind CSS IntelliSense** | `bradlc.vscode-tailwindcss` | Autocomplete de classes Tailwind, preview de cores, ordenação automática. Indispensável para frontend. |
| **Prisma** | `Prisma.prisma` | Syntax highlighting, autocomplete e formatação para arquivos `.prisma`. Essencial para trabalhar com o schema. |
| **GitLens** | `eamodio.gitlens` | Mostra quem escreveu cada linha (git blame inline), histórico de arquivo, comparação de branches. |
| **Docker** | `ms-azuretools.vscode-docker` | Gerencia containers, imagens e compose direto do editor. Syntax highlighting para Dockerfiles. |
| **Thunder Client** | `rangav.vscode-thunder-client` | Cliente HTTP dentro do editor. Teste endpoints da API sem sair do VS Code. Alternativa leve ao Postman. |
| **Error Lens** | `usernamehw.errorlens` | Mostra erros e warnings inline, direto na linha do código. Muito mais visível que o sublinhado padrão. |
| **Auto Rename Tag** | `formulahendry.auto-rename-tag` | Renomeia automaticamente a tag de fechamento quando você edita a tag de abertura em JSX/HTML. |
| **Material Icon Theme** | `PKief.material-icon-theme` | Ícones bonitos e distintos para cada tipo de arquivo e pasta. Facilita navegação visual. |

**Como instalar todas de uma vez via terminal:**

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension Prisma.prisma
code --install-extension eamodio.gitlens
code --install-extension ms-azuretools.vscode-docker
code --install-extension rangav.vscode-thunder-client
code --install-extension usernamehw.errorlens
code --install-extension formulahendry.auto-rename-tag
code --install-extension PKief.material-icon-theme
```

> **Cursor:** substitua `code` por `cursor` nos comandos acima.

**Configurações recomendadas** — adicione ao `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "editor.tabSize": 2,
  "editor.wordWrap": "on"
}
```

---

## 1.6 — Seu primeiro dia: checklist numerado

Faça nesta ordem. Risque cada item antes de passar para o próximo.

| # | Tarefa | Tempo estimado | Como saber que terminou |
|---|--------|---------------|------------------------|
| 1 | **Leia este documento inteiro** (01-onboarding.md) | 30 min | Você sabe o que é um DTO, um Guard e um Server Component |
| 2 | **Faça o setup completo** (seção 1.4) | 45 min | `localhost:3000` mostra a tela de login, `localhost:3001/api/health` retorna JSON |
| 3 | **Instale todas as extensões** (seção 1.5) | 10 min | ESLint e Prettier formatam o código ao salvar |
| 4 | **Leia o 02-arquitetura.md** | 20 min | Você consegue explicar o caminho de uma request do clique até o banco |
| 5 | **Leia o 03-nomenclatura-e-padroes.md** | 20 min | Você sabe nomear um arquivo, uma variável e um endpoint corretamente |
| 6 | **Abra o projeto no editor e navegue pelas pastas** | 15 min | Você encontrou o controller de products, o service, o repository e o DTO |
| 7 | **Pegue sua primeira tarefa e faça um PR** | restante do dia | Você abriu um PR seguindo o padrão, pediu review, e está esperando aprovação |

**Dica final:** nos primeiros dias, erre do lado da cautela. Pergunte antes de inventar. Consulte os docs antes de criar. E quando a LLM sugerir algo que parece mágica — desconfie, entenda, e só então aceite.

---

## Próximos passos

Agora que você está com o ambiente rodando e sabe o básico, aprofunde na ordem que fizer sentido para você:

| Próximo doc | Quando ler |
|-------------|-----------|
| [02-arquitetura.md](02-arquitetura.md) | Para entender como frontend, backend e banco se conectam |
| [03-nomenclatura-e-padroes.md](03-nomenclatura-e-padroes.md) | **Antes de criar qualquer arquivo** — consulta obrigatória |
| [04-backend.md](04-backend.md) | Quando começar a trabalhar no backend NestJS |
| [05-frontend.md](05-frontend.md) | Quando começar a trabalhar no frontend Next.js |
| [06-banco-de-dados.md](06-banco-de-dados.md) | Quando precisar mexer em schema, migrations ou queries |
| [07-autenticacao.md](07-autenticacao.md) | Quando precisar implementar login ou proteger rotas |
| [08-api.md](08-api.md) | Quando precisar criar ou consumir endpoints |
| [09-git-workflow.md](09-git-workflow.md) | Antes do primeiro commit |
| [10-devops.md](10-devops.md) | Quando precisar mexer em Docker, CI/CD ou deploy |
| [11-seguranca.md](11-seguranca.md) | Para revisar checklist de segurança |
| [12-guia-vibecoding.md](12-guia-vibecoding.md) | Para aprender a usar LLMs do jeito certo no dia a dia |
| [00-indice.md](00-indice.md) | Para voltar ao mapa geral |
