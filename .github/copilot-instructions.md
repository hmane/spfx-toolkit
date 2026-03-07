# Copilot Instructions - SPFx Toolkit

Repository-wide GitHub Copilot instructions for this package.

## Quick Facts

- This repo is an SPFx component library, not a web part.
- Target stack: SPFx >= 1.21.1, React 17, TypeScript 4.7+.
- `lib/` is the real compiled output.
- Root `components/`, `hooks/`, `utilities/`, `types/`, and `utils/` are generated compatibility shims. Do not edit them manually.

## Dependency Rules

- Do not add new runtime dependencies unless explicitly required and justified.
- Stay within the peer dependency model defined in `package.json`.
- Prefer existing utilities over adding packages such as lodash, moment, date-fns, axios, or styled-components.

## Import Rules

- Inside this library, use relative imports only.
- Do not use path aliases.
- Do not self-import from `spfx-toolkit/...` inside `src/`.

```ts
// Correct
import { SPContext } from '../../utilities/context';
import type { IComponentProps } from './ComponentName.types';

// Wrong
import { SPContext } from 'spfx-toolkit/utilities/context';
import { IComponentProps } from '@/components/ComponentName.types';
```

- For Fluent UI, use subpath imports such as `@fluentui/react/lib/Button`, not `@fluentui/react`.

## Consumer-Facing Guidance

When writing docs, examples, or public exports:

- Prefer `spfx-toolkit/components/...`, `spfx-toolkit/hooks`, and `spfx-toolkit/utilities/...`.
- Keep `spfx-toolkit/lib/...` only as a legacy fallback for older SPFx consumers.
- Do not recommend root component imports from `spfx-toolkit`.

## SPContext Rules

- `SPContext` must be initialized by the consuming web part before toolkit components are used.
- In optional infrastructure code, prefer safe accessors such as `tryGetContext()`, `tryGetSP()`, and `tryGetFreshSP()` when context availability is uncertain.
- Use `SPContext.logger` instead of `console.log`, `console.warn`, or `console.error` in library code.

## Component Rules

- Use functional React components and hooks.
- Define explicit TypeScript interfaces for props.
- Keep styles scoped.
- Handle async cleanup correctly with cancellation/versioning patterns where needed.
- Avoid unsafe HTML rendering unless content is sanitized first.

## Build and Generated Output

- `npm run build` should emit `lib/` and regenerate the compatibility shim folders.
- Do not manually edit generated output under `lib/`, `components/`, `hooks/`, `utilities/`, `types/`, or `utils/`.
- Source of truth is `src/`, `package.json`, `tsconfig.json`, and `gulpfile.js`.

## Validation Checklist

Before finalizing changes:

- `npm run build`
- `npm run type-check`
- `npm pack --dry-run` for packaging changes
- Ensure docs match the current package shape and do not overstate bundle-size guarantees

*Last Updated: March 7, 2026*
