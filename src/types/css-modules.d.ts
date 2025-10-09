/**
 * CSS Module declarations for TypeScript
 * This allows importing CSS files in TypeScript/React components
 */

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.less' {
  const content: { [className: string]: string };
  export default content;
}

// Allow side-effect imports of CSS files
declare module '*.css' {
  const css: string;
  export = css;
}
