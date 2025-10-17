/**
 * Fluent UI Type Definitions
 *
 * This file contains type definitions extracted from Fluent UI to avoid
 * importing from the main package and breaking tree-shaking.
 */

/**
 * Directional hint for tooltips, callouts, and other positioned elements.
 * Replaces @fluentui/react DirectionalHint to maintain tree-shaking.
 *
 * @see https://developer.microsoft.com/en-us/fluentui#/controls/web/callout
 */
export enum DirectionalHint {
  /**
   * Appear above the target element, with left edges aligned.
   */
  topLeftEdge = 0,

  /**
   * Appear above the target element, with centers aligned.
   */
  topCenter = 1,

  /**
   * Appear above the target element, with right edges aligned.
   */
  topRightEdge = 2,

  /**
   * Appear above the target element, with auto horizontal alignment.
   */
  topAutoEdge = 3,

  /**
   * Appear below the target element, with left edges aligned.
   */
  bottomLeftEdge = 4,

  /**
   * Appear below the target element, with centers aligned.
   */
  bottomCenter = 5,

  /**
   * Appear below the target element, with right edges aligned.
   */
  bottomRightEdge = 6,

  /**
   * Appear below the target element, with auto horizontal alignment.
   */
  bottomAutoEdge = 7,

  /**
   * Appear to the left of the target element, with top edges aligned.
   */
  leftTopEdge = 8,

  /**
   * Appear to the left of the target element, with centers aligned.
   */
  leftCenter = 9,

  /**
   * Appear to the left of the target element, with bottom edges aligned.
   */
  leftBottomEdge = 10,

  /**
   * Appear to the right of the target element, with top edges aligned.
   */
  rightTopEdge = 11,

  /**
   * Appear to the right of the target element, with centers aligned.
   */
  rightCenter = 12,

  /**
   * Appear to the right of the target element, with bottom edges aligned.
   */
  rightBottomEdge = 13,
}
