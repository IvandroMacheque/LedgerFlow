# LedgerFlow

Motor financeiro e Engineering & Chaos Playground organizados em aplicações independentes:

```text
server/   # Backend, testes, exemplos, dependências e configuração do PostgreSQL
web/      # Interface React + Tailwind CSS
docs/     # Specs, ADRs, documentação de banco e post-mortems compartilhados
```

## Backend

Execute da raiz do repositório:

```sh
rtk npm ci --prefix server
rtk npm test --prefix server
rtk npm run test:watch --prefix server
rtk npm run test:mutate --prefix server
rtk npm run test:exemplos --prefix server
rtk docker compose -f server/docker-compose.yml up -d
```

O ambiente local fica em `server/.env`, preservado durante a movimentação e ignorado pelo Git. Consulte `server/.env.example` ao configurar uma nova instalação. Testes de integração exigem o PostgreSQL disponível. O Compose mantém o nome de projeto `ledgerflow` para continuar referenciando o volume `ledgerflow_pgdata`; a movimentação não recria nem remove o banco.

Também é possível executar os comandos diretamente de `server/`. Caminhos `src/`, `tests/` e `exemplos-aprendizado/` nas specs históricas das Fases 1–6 são relativos a essa pasta. O backend mantém os scripts existentes; esta reorganização não adiciona servidor HTTP ou novos comandos de inicialização.

## Frontend

```sh
rtk npm ci --prefix web
rtk npm run dev --prefix web
rtk npm test --prefix web
rtk npm run build --prefix web
```

Consulte [web/README.md](web/README.md) e [[fase-07-web-engineering-playground]]. A arquitetura do motor está descrita em [[fase-06-system-design-governance]] e [[adr-001-transactional-outbox-and-modular-monolith]].
