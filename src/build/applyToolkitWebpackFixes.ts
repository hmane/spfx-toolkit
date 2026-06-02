/**
 * Build-tool-agnostic webpack fixes for consuming spfx-toolkit via `npm link`.
 *
 * `buildPeerAliases` and `rewriteControlScssRequest` are PURE. `applyToolkitWebpackFixes`
 * is an ADDITIVE IN-PLACE transform: it mutates the passed webpack config (adding
 * `resolve.symlinks=false`, dedup aliases, and one NormalModuleReplacementPlugin) and
 * returns the SAME object. Unrelated config keys are preserved. No SPFx/runtime
 * dependency; safe to call from fast-serve `webpack.extend.js` and a Heft webpack hook.
 */
import * as path from 'path';

export interface ToolkitWebpackFixOptions {
  /** Peers to alias to the consumer's single copy. `false` disables aliasing. Default: DEFAULT_ALIAS_PEERS. */
  aliasPeers?: ReadonlyArray<string> | false;
  /** Set `resolve.symlinks = false` so a linked toolkit resolves peers from the consumer tree. Default: true. */
  dedupeSymlinks?: boolean;
  /** Rewrite nested @pnp/spfx-controls-react `.module.scss` -> `.module.scss.js`. Default: true. */
  rewriteControlScss?: boolean;
  /** Root to resolve the consumer's peers (and webpack) from. Default: process.cwd(). */
  consumerRoot?: string;
  /** Inject the webpack instance to use for the plugin. If omitted, webpack is lazy-resolved from consumerRoot. */
  webpack?: { NormalModuleReplacementPlugin: any };
  /** Optional warning sink. Default: no-op. */
  onWarn?: (message: string) => void;
}

/** Default alias set: version-stable peers + `@pnp/spfx-controls-react`.
 *  `@pnp/sp` and `@pnp/queryable` are intentionally EXCLUDED — `@pnp/spfx-controls-react`
 *  bundles @pnp/sp v2, so aliasing the bare core PnP packages to the consumer's v3 copy
 *  would redirect the controls' nested v2 imports to v3 and break them. Opt in via
 *  `options.aliasPeers` only if you understand that hazard. */
export const DEFAULT_ALIAS_PEERS: ReadonlyArray<string> = [
  'react',
  'react-dom',
  '@fluentui/react',
  '@pnp/spfx-controls-react',
  'devextreme',
  'devextreme-react',
  'react-hook-form',
  'react-mentions',
  'zustand',
];

/** PURE: build a `resolve.alias` map pointing each resolvable peer at the consumer's package dir. */
export function buildPeerAliases(
  peers: ReadonlyArray<string>,
  resolvePeer: (peer: string) => string | undefined
): Record<string, string> {
  const alias: Record<string, string> = {};
  for (const peer of peers) {
    const dir = resolvePeer(peer);
    if (dir) {
      alias[peer] = dir; // bare name -> consumer dir (also covers subpath imports)
    }
  }
  return alias;
}

/** PURE: given a webpack request + importing context, return the rewritten request
 *  (or undefined to leave it alone). Rewrites ONLY `.module.scss` imported from the
 *  NESTED linked-toolkit controls copy
 *  (`.../node_modules/spfx-toolkit/node_modules/@pnp/spfx-controls-react/...`),
 *  never a top-level consumer copy of `@pnp/spfx-controls-react`. */
export function rewriteControlScssRequest(request: string, context: string): string | undefined {
  if (!request.endsWith('.module.scss')) {
    return undefined;
  }
  const needle =
    `${path.sep}node_modules${path.sep}spfx-toolkit${path.sep}node_modules${path.sep}` +
    `@pnp${path.sep}spfx-controls-react${path.sep}`;
  if (!context || context.indexOf(needle) < 0) {
    return undefined;
  }
  return `${request}.js`;
}

export function applyToolkitWebpackFixes<T extends { resolve?: any; plugins?: any[] }>(
  config: T,
  options: ToolkitWebpackFixOptions = {}
): T {
  const consumerRoot = options.consumerRoot || process.cwd();
  const onWarn = options.onWarn || ((): void => undefined);

  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.plugins = config.plugins || [];

  // 1. dedupe linked-toolkit peers to the consumer tree (primary mechanism)
  if (options.dedupeSymlinks !== false) {
    config.resolve.symlinks = false;
  }

  // 2. alias version-stable peers to the consumer's single copy
  if (options.aliasPeers !== false) {
    const peers = Array.isArray(options.aliasPeers) ? options.aliasPeers : DEFAULT_ALIAS_PEERS;
    const resolvePeer = (peer: string): string | undefined => {
      try {
        return path.dirname((require as any).resolve(`${peer}/package.json`, { paths: [consumerRoot] }));
      } catch {
        onWarn(`spfx-toolkit/build: peer '${peer}' not resolvable from ${consumerRoot}; skipping alias`);
        return undefined;
      }
    };
    Object.assign(config.resolve.alias, buildPeerAliases(peers, resolvePeer));
  }

  // 3. rewrite nested linked-toolkit @pnp/spfx-controls-react .module.scss -> precompiled .module.scss.js
  if (options.rewriteControlScss !== false) {
    let webpack = options.webpack;
    if (!webpack) {
      try {
        // webpack is provided by the consumer build (fast-serve / Heft); resolve from consumerRoot.
        webpack = require((require as any).resolve('webpack', { paths: [consumerRoot] }));
      } catch {
        onWarn('spfx-toolkit/build: webpack not resolvable; skipping .module.scss rewrite');
      }
    }
    if (webpack && webpack.NormalModuleReplacementPlugin) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/\.module\.scss$/, (resource: any) => {
          const rewritten = rewriteControlScssRequest(resource.request, resource.context || '');
          if (rewritten) {
            resource.request = rewritten;
          }
        })
      );
    }
  }

  return config;
}
