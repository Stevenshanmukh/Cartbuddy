# Contributing to CartBuddy

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/Stevenshanmukh/Cartbuddy.git
cd Cartbuddy
npm install
cp .env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
```

## Branch Workflow

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run checks: `npm run test && npm run lint && npm run type-check`
5. Commit with a descriptive message
6. Open a Pull Request

## Code Style

- **TypeScript** — Avoid `any` types; use proper interfaces
- **Components** — One component per file, co-locate styles
- **Server Actions** — All mutation logic in `src/app/actions/`
- **Hooks** — Custom hooks in `src/hooks/`
- **Tests** — Add tests for new features in `src/__tests__/`

## Commit Messages

Use conventional format:

```
feat: add store search filter
fix: resolve undo-delete creating duplicates
test: add item-card component tests
docs: update setup instructions
```

## PR Checklist

- [ ] All tests pass (`npm run test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No lint warnings (`npm run lint`)
- [ ] New features have tests
- [ ] No `console.log` statements
