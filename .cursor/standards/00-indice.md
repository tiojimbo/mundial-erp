# Base de Conhecimento Bravy — Comece Aqui

Bem-vindo a base de conhecimento da Bravy. Este documento e o seu ponto de partida. Nao importa se voce acabou de chegar ou se ja esta no dia a dia — encontre sua situacao abaixo e va direto para o arquivo certo.

---

## Quem e voce? O que precisa?

| # | Sua situacao | Documento | O que voce encontra |
|---|-------------|-----------|-------------------|
| 1 | "Acabei de entrar na Bravy" | [01-onboarding.md](01-onboarding.md) | Setup do ambiente, glossario, filosofia |
| 2 | "Preciso entender a arquitetura de um projeto" | [02-arquitetura.md](02-arquitetura.md) | Como frontend, backend e banco se conectam |
| 3 | "Estou criando/nomeando um arquivo e nao sei o padrao" | [03-nomenclatura-e-padroes.md](03-nomenclatura-e-padroes.md) | Tabelas de referencia rapida certo/errado |
| 4 | "Estou trabalhando no backend" | [04-backend.md](04-backend.md) | Estrutura de pastas, camadas, patterns NestJS |
| 5 | "Estou trabalhando no frontend" | [05-frontend.md](05-frontend.md) | Estrutura de pastas, componentes, patterns Next.js |
| 6 | "Estou mexendo no banco de dados" | [06-banco-de-dados.md](06-banco-de-dados.md) | Schema, migrations, queries, Prisma |
| 7 | "Preciso implementar login/autenticacao" | [07-autenticacao.md](07-autenticacao.md) | Fluxo completo backend + frontend |
| 8 | "Preciso criar ou consumir uma API" | [08-api.md](08-api.md) | Endpoints, responses, paginacao |
| 9 | "Preciso commitar/versionar meu codigo" | [09-git-workflow.md](09-git-workflow.md) | Branches, commits, PRs |
| 10 | "Preciso fazer deploy ou configurar Docker" | [10-devops.md](10-devops.md) | Dockerfiles, compose, nginx, CI/CD |
| 11 | "Preciso revisar seguranca" | [11-seguranca.md](11-seguranca.md) | Checklist de seguranca aplicada |
| 12 | "Quero pedir algo para a LLM e quero fazer certo" | [12-guia-vibecoding.md](12-guia-vibecoding.md) | Prompts prontos, receitas, anti-patterns |
| 13 | "Sou uma LLM recebendo este documento como contexto" | [99-referencia-completa.md](99-referencia-completa.md) | Tudo em arquivo unico, otimizado para context window |

---

## Como usar esta base

1. **Nao leia tudo de uma vez.** Va pelo que precisa agora. Cada documento e independente.
2. **Use como referencia diaria.** Especialmente o [03-nomenclatura-e-padroes.md](03-nomenclatura-e-padroes.md) — consulte antes de nomear qualquer coisa.
3. **Passe para a LLM.** Ao usar Claude, Cursor ou qualquer LLM, passe o documento relevante como contexto. O arquivo [99-referencia-completa.md](99-referencia-completa.md) consolida tudo em um so lugar para isso.
4. **Sugira melhorias.** Encontrou algo desatualizado ou confuso? Abra um PR ou avise o time.

---

## Ordem sugerida para quem esta comecando

Se voce acabou de chegar, siga esta ordem:

1. **[01-onboarding.md](01-onboarding.md)** — Entenda a filosofia, aprenda o glossario, faca o setup
2. **[02-arquitetura.md](02-arquitetura.md)** — Veja como as pecas se encaixam
3. **[03-nomenclatura-e-padroes.md](03-nomenclatura-e-padroes.md)** — Aprenda a lei dos nomes (consulta diaria)
4. **[04-backend.md](04-backend.md)** ou **[05-frontend.md](05-frontend.md)** — Aprofunde na sua area
5. **[12-guia-vibecoding.md](12-guia-vibecoding.md)** — Aprenda a usar LLMs do jeito certo
6. Pegue sua primeira tarefa e use os outros documentos conforme a necessidade

---

## Stack da Bravy (referencia rapida)

| Tecnologia | Papel |
|-----------|-------|
| TypeScript | Linguagem |
| NestJS | Backend |
| Next.js (App Router) | Frontend |
| PostgreSQL | Banco de dados |
| Prisma | ORM |
| Tailwind CSS | Estilizacao |
| shadcn/ui | Componentes UI |
| Docker | Containerizacao |
| JWT | Autenticacao |

Para detalhes sobre cada tecnologia e por que a Bravy escolheu, veja [01-onboarding.md](01-onboarding.md#13--a-stack-bravy).