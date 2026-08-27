# Installation

Shikumi requires **Bun** (`>=1.0`).

```bash
# 1. Clone
git clone https://github.com/your-org/shikumi.git
cd shikumi

# 2. Install (Bun is the only package manager)
bun install

# 3. Configure keys (BYOK)
cp .env.example .env.development
# edit OPENAI_API_KEY, or run:
bun run src/cli/index.ts setup
# creates .shikumi/config.json (gitignored)

# 4. Run
bun run dev        # same as shikumi
bun run src/cli/index.ts --help
```

## Global via npm

Available at [npmjs.com/package/@irfan140/shikumi](https://www.npmjs.com/package/@irfan140/shikumi)

```bash
npm add @irfan140/shikumi
# or
bun add @irfan140/shikumi
bun install -g @irfan140/shikumi
shikumi --help
# or without install
bunx @irfan140/shikumi
```

## Verify

```bash
bun run typecheck
bun run build      # → dist/index.js (4 MB bundled)
npm pack --dry-run # verify no .env / .shikumi in tarball
```
