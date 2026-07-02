# Vinc

Marketplace de serviços por horário para o mercado brasileiro: pessoas anunciam
vagas de trabalho em horários específicos (ex.: babá das 15h às 22h no dia X,
com valor definido) e prestadores de serviço as aceitam pelo app, preenchendo
horários livres da sua agenda e recebendo o pagamento pela plataforma.

- **Plataformas:** iOS, Android e web (React Native + Expo, código único)
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Documentação completa:** [`docs/`](docs/README.md) — comece por lá
- **Instruções para desenvolvimento com Claude Code:** [`CLAUDE.md`](CLAUDE.md)

## Como rodar localmente

Pré-requisitos (uma vez só):

1. **Node.js 22 LTS** — instalador em <https://nodejs.org>
   (confira com `node --version`).
2. **pnpm** — `npm install -g pnpm`

Rodando o app:

```bash
git clone https://github.com/davidbuckley96/vinc.git
cd vinc
pnpm install
cp apps/mobile/.env.example apps/mobile/.env
pnpm web   # abre no navegador (http://localhost:8081)
```

- **No celular:** rode `pnpm app`, instale o aplicativo **Expo Go**
  (Play Store/App Store) e escaneie o QR code do terminal — celular e
  computador no mesmo Wi-Fi.
- **Verificações:** `pnpm typecheck` e `pnpm test`.
