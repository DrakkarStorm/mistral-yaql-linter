/**
 * Generic Position and Range types for the core linter logic.
 * These are independent of VS Code types.
 */

/**
 * Represents a zero-based position in a text document.
 */
export class Position {
  /**
   * @param line - Zero-based line number
   * @param character - Zero-based character (column) offset
   */
  constructor(
    public line: number,
    public character: number
  ) { }
}

/**
 * Represents a range between two Positions in a text document.
 */
export class Range {
  /**
   * @param start - The start position of the range (inclusive)
   * @param end - The end position of the range (exclusive)
   */
  constructor(
    public start: Position,
    public end: Position
  ) { }
}
