// Simple 6502 Assembly Parser using StreamLanguage
// This avoids the complexity of building a full Lezer grammar

import { StreamLanguage, StringStream } from "@codemirror/language";

// 6502 Opcodes
const opcodes = new Set([
  // Standard 6502
  "ADC", "AND", "ASL", "BCC", "BCS", "BEQ", "BIT", "BMI", "BNE", "BPL",
  "BRK", "BVC", "BVS", "CLC", "CLD", "CLI", "CLV", "CMP", "CPX", "CPY",
  "DEC", "DEX", "DEY", "EOR", "INC", "INX", "INY", "JMP", "JSR", "LDA",
  "LDX", "LDY", "LSR", "NOP", "ORA", "PHA", "PHP", "PLA", "PLP", "ROL",
  "ROR", "RTI", "RTS", "SBC", "SEC", "SED", "SEI", "STA", "STX", "STY",
  "TAX", "TAY", "TSX", "TXA", "TXS", "TYA",
  // 65C02 extensions
  "BRA", "PHX", "PHY", "PLX", "PLY", "STZ", "TRB", "TSB",
  "BBR0", "BBR1", "BBR2", "BBR3", "BBR4", "BBR5", "BBR6", "BBR7",
  "BBS0", "BBS1", "BBS2", "BBS3", "BBS4", "BBS5", "BBS6", "BBS7",
  "RMB0", "RMB1", "RMB2", "RMB3", "RMB4", "RMB5", "RMB6", "RMB7",
  "SMB0", "SMB1", "SMB2", "SMB3", "SMB4", "SMB5", "SMB6", "SMB7",
]);

const registers = new Set(["A", "X", "Y", "S", "SP", "PC"]);

const directives = new Set([
  ".ORG", ".BYTE", ".WORD", ".DWORD", ".FILL", ".ALIGN",
  ".DB", ".DW", ".DD", ".DS", ".EQU", ".SET",
  ".INCLUDE", ".INCBIN", ".IF", ".ELSE", ".ENDIF", ".IFDEF", ".IFNDEF",
  ".MACRO", ".ENDM", ".ENDMACRO", ".REPT", ".ENDR",
  ".SEGMENT", ".CODE", ".DATA", ".BSS", ".RODATA",
  ".PROC", ".ENDPROC", ".SCOPE", ".ENDSCOPE",
  ".EXPORT", ".IMPORT", ".GLOBAL", ".LOCAL",
  ".ASSERT", ".WARNING", ".ERROR", ".RES", ".ASCIIZ", ".ASCII",
  "ORG", "EQU", "DB", "DW", "DS", "BYTE", "WORD", "END",
]);

function tokenize6502(stream: StringStream, _state: { inLabel: boolean }): string | null {
  // Skip whitespace
  if (stream.eatSpace()) {
    return null;
  }

  // Comments
  if (stream.match(";")) {
    stream.skipToEnd();
    return "comment";
  }

  // Labels at start of line (end with :)
  if (stream.sol()) {
    const labelMatch = stream.match(/^([A-Za-z_@][A-Za-z0-9_@]*)\s*:/);
    if (labelMatch) {
      return "labelName";
    }
    // Label without colon (common in some assemblers)
    const implicitLabel = stream.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(?=[A-Za-z.])/);
    if (implicitLabel && typeof implicitLabel !== 'boolean') {
      stream.backUp(implicitLabel[0].length - implicitLabel[1].length);
      return "labelName";
    }
  }

  // Local labels (start with @, ., or digit)
  if (stream.match(/^[@.][A-Za-z_][A-Za-z0-9_]*/)) {
    return "labelName";
  }

  // Directives
  if (stream.match(/^\.[A-Za-z]+/i) || stream.match(/^[A-Za-z]+(?=\s|$)/)) {
    const word = stream.current().toUpperCase();
    if (directives.has(word)) {
      return "meta";
    }
    stream.backUp(stream.current().length);
  }

  // Opcodes
  const opcodeMatch = stream.match(/^[A-Za-z]{2,4}[0-7]?/i);
  if (opcodeMatch) {
    const word = stream.current().toUpperCase();
    if (opcodes.has(word)) {
      return "keyword";
    }
    if (directives.has(word)) {
      return "meta";
    }
    // Check if it's a register
    if (registers.has(word)) {
      return "variableName.special";
    }
    // Must be a label reference
    stream.backUp(stream.current().length);
  }

  // Hex numbers ($xx or 0x)
  if (stream.match(/^\$[0-9A-Fa-f]+/) || stream.match(/^0x[0-9A-Fa-f]+/i)) {
    return "number";
  }

  // Binary numbers (%...)
  if (stream.match(/^%[01]+/)) {
    return "number";
  }

  // Decimal numbers
  if (stream.match(/^#?\d+/)) {
    return "number";
  }

  // Immediate mode indicator
  if (stream.match("#")) {
    return "operator";
  }

  // Strings
  if (stream.match(/"[^"]*"/) || stream.match(/'[^']*'/)) {
    return "string";
  }

  // Registers in operand position
  if (stream.match(/^[AXYaxy](?=\s|,|$|;)/)) {
    return "variableName.special";
  }

  // Operators
  if (stream.match(/^[+\-*/<>=&|^!~,()[\]]/)) {
    return "operator";
  }

  // Identifiers (label references)
  if (stream.match(/^[A-Za-z_@][A-Za-z0-9_@]*/)) {
    return "variableName";
  }

  // Any other character
  stream.next();
  return null;
}

export const asm6502StreamLanguage = StreamLanguage.define({
  name: "asm6502",
  startState: () => ({ inLabel: false }),
  token: tokenize6502,
  languageData: {
    commentTokens: { line: ";" },
    closeBrackets: { brackets: ["(", "[", '"', "'"] },
  },
});

// Re-export the actual parser reference for compatibility
export const parser = {
  configure: () => asm6502StreamLanguage.parser,
};
