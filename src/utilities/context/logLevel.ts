/**
 * Local mirror of PnP JS LogLevel values.
 *
 * PnP packages are ESM-only in current releases, while this package currently
 * emits CommonJS. Keeping the enum local lets logger/debug utilities be imported
 * in Node-based tests and tooling without eagerly loading PnP at module init.
 */
export enum LogLevel {
  Verbose = 0,
  Info = 1,
  Warning = 2,
  Error = 3,
  Off = 99,
}
