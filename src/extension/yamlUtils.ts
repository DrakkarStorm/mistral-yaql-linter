import * as vscode from "vscode";
import {
  Kind,
  load as parse,
  YAMLMapping,
  YAMLNode,
  YAMLSequence,
} from "yaml-ast-parser";

/**
 * Parse the document text into an AST and return the deepest node at the given offset.
 * @param text, the text of the document
 * @param offset, the offset of the cursor in the document
 * @returns the YAML node at the given offset
 */
export function getYAMLNodeAt(text: string, offset: number): YAMLNode | null {
  const root = parse(text) as YAMLNode;
  let found: YAMLNode | null = null;

  /**
   * Traverse the AST and find the deepest node at the given offset.
   */
  function traverse(node: YAMLNode) {
    if (node.startPosition === null || node.endPosition === null) {
      return;
    }

    if (node.startPosition <= offset && offset <= node.endPosition) {
      // We are in the right range, but we need to check if we are deeper
      found = node;

      switch (node.kind) {
        case Kind.MAP:
          // A map contains a list of mappings
          for (const m of (node as any) /*MAP*/.mappings as YAMLMapping[]) {
            traverse(m);
          }
          break;

        case Kind.MAPPING:
          // Mapping = single key/value pair
          const mapping = node as YAMLMapping;
          traverse(mapping.key);
          traverse(mapping.value);
          break;

        case Kind.SEQ:
          // Sequence = list of items
          for (const item of (node as YAMLSequence).items) {
            traverse(item);
          }
          break;

        // SCALAR, ANCHOR_REF, INCLUDE_REF, etc. are leaves
        default:
          break;
      }
    }
  }

  traverse(root);
  return found;
}

/**
 * Climb up from a node to collect ancestor mapping keys.
 * @param node, The node to start from.
 * @returns An array of keys representing the path to the node, e.g. ['workflows','myWf','tasks','myTask','requires'].
 */
export function getPath(node: YAMLNode): string[] {
  const path: string[] = [];
  let curr: YAMLNode | undefined = node;

  while (curr) {
    if (curr.kind === Kind.MAPPING) {
      // curr is a mapping key → value, we want the key
      const mapping = curr as YAMLMapping;
      const keyNode = mapping.key;
      path.unshift(keyNode.value.toString());
    }
    curr = (curr as any).parent;
  }

  return path;
}

/**
 * Convert a Position to an absolute offset.
 * @param document, The document to use.
 * @param pos, The position to convert.
 * @returns The offset.
 */
export function offsetAt(
  document: vscode.TextDocument,
  pos: vscode.Position
): number {
  return document.offsetAt(pos);
}
