// CodeMirror Theme Bridge
// Maps CSS custom properties to CodeMirror theme

import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Base editor theme using CSS variables
export const retroTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-primary)",
    height: "100%",
    fontSize: "14px",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-content": {
    caretColor: "var(--accent-color)",
    padding: "8px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--accent-color)",
    borderLeftWidth: "2px",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "var(--selection-bg)",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--selection-bg)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--bg-tertiary)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-secondary)",
    border: "none",
    borderRight: "1px solid var(--border-color)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--text-primary)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 16px",
    minWidth: "40px",
  },
  ".cm-foldGutter .cm-gutterElement": {
    padding: "0 4px",
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "var(--bracket-match-bg)",
    outline: "1px solid var(--accent-color)",
  },
  ".cm-searchMatch": {
    backgroundColor: "var(--search-match-bg)",
    outline: "1px solid var(--accent-color)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "var(--search-match-selected-bg)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li[aria-selected]": {
      backgroundColor: "var(--accent-color)",
      color: "var(--text-primary)",
    },
  },
  ".cm-panels": {
    backgroundColor: "var(--bg-secondary)",
    color: "var(--text-primary)",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid var(--border-color)",
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid var(--border-color)",
  },
});

// Syntax highlighting colors
export const retroHighlightStyle = HighlightStyle.define([
  // Comments
  { tag: tags.comment, color: "var(--syntax-comment)" },
  { tag: tags.lineComment, color: "var(--syntax-comment)" },
  { tag: tags.blockComment, color: "var(--syntax-comment)" },
  { tag: tags.docComment, color: "var(--syntax-comment)", fontStyle: "italic" },

  // Strings
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: tags.character, color: "var(--syntax-string)" },
  { tag: tags.special(tags.string), color: "var(--syntax-string)" },

  // Numbers
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: tags.integer, color: "var(--syntax-number)" },
  { tag: tags.float, color: "var(--syntax-number)" },

  // Keywords
  { tag: tags.keyword, color: "var(--syntax-keyword)" },
  { tag: tags.controlKeyword, color: "var(--syntax-keyword)", fontWeight: "bold" },
  { tag: tags.operatorKeyword, color: "var(--syntax-keyword)" },
  { tag: tags.definitionKeyword, color: "var(--syntax-keyword)" },
  { tag: tags.moduleKeyword, color: "var(--syntax-keyword)" },

  // Operators
  { tag: tags.operator, color: "var(--syntax-operator)" },
  { tag: tags.arithmeticOperator, color: "var(--syntax-operator)" },
  { tag: tags.logicOperator, color: "var(--syntax-operator)" },
  { tag: tags.compareOperator, color: "var(--syntax-operator)" },

  // Functions
  { tag: tags.function(tags.variableName), color: "var(--syntax-function)" },
  { tag: tags.definition(tags.function(tags.variableName)), color: "var(--syntax-function)" },

  // Variables and identifiers
  { tag: tags.variableName, color: "var(--text-primary)" },
  { tag: tags.definition(tags.variableName), color: "var(--syntax-variable)" },
  { tag: tags.local(tags.variableName), color: "var(--syntax-variable)" },

  // Types
  { tag: tags.typeName, color: "var(--syntax-type)" },
  { tag: tags.className, color: "var(--syntax-type)" },
  { tag: tags.namespace, color: "var(--syntax-type)" },

  // Labels (important for assembly)
  { tag: tags.labelName, color: "var(--syntax-label)" },
  { tag: tags.definition(tags.labelName), color: "var(--syntax-label)", fontWeight: "bold" },

  // Macros and preprocessor
  { tag: tags.macroName, color: "var(--syntax-macro)" },
  { tag: tags.processingInstruction, color: "var(--syntax-macro)" },
  { tag: tags.meta, color: "var(--syntax-macro)" },

  // Assembly-specific
  { tag: tags.standard(tags.name), color: "var(--syntax-instruction)" }, // Instructions/opcodes
  { tag: tags.special(tags.variableName), color: "var(--syntax-register)" }, // Registers

  // Punctuation
  { tag: tags.punctuation, color: "var(--text-secondary)" },
  { tag: tags.bracket, color: "var(--text-secondary)" },
  { tag: tags.paren, color: "var(--text-secondary)" },
  { tag: tags.brace, color: "var(--text-secondary)" },
  { tag: tags.separator, color: "var(--text-secondary)" },

  // Invalid/errors
  { tag: tags.invalid, color: "var(--syntax-error)", textDecoration: "underline wavy" },

  // Links
  { tag: tags.link, color: "var(--accent-color)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--accent-color)" },

  // Headings (for markdown)
  { tag: tags.heading, color: "var(--syntax-keyword)", fontWeight: "bold" },
  { tag: tags.heading1, color: "var(--syntax-keyword)", fontWeight: "bold", fontSize: "1.4em" },
  { tag: tags.heading2, color: "var(--syntax-keyword)", fontWeight: "bold", fontSize: "1.2em" },

  // Emphasis
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
]);

// Combined theme extension
export const retroThemeExtension = [
  retroTheme,
  syntaxHighlighting(retroHighlightStyle),
];
