// Markdown Code Block Highlighter
// Adds line decorations to fenced code blocks in Markdown files

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

// Line decoration for code block lines
const codeBlockLineDecoration = Decoration.line({
  class: "cm-codeblock-line"
});

// View plugin that tracks and decorates code block lines
const codeBlockHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;

      // Parse the syntax tree to find fenced code blocks
      syntaxTree(view.state).iterate({
        enter: (node) => {
          // FencedCode is the node type for fenced code blocks in markdown
          if (node.name === "FencedCode") {
            const startLine = doc.lineAt(node.from).number;
            const endLine = doc.lineAt(node.to).number;

            // Add decoration to each line in the code block
            for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
              const line = doc.line(lineNum);
              builder.add(line.from, line.from, codeBlockLineDecoration);
            }
          }
        }
      });

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations
  }
);

export function markdownCodeBlockHighlighter(): typeof codeBlockHighlighter {
  return codeBlockHighlighter;
}
