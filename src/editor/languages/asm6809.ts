// 6809 Assembly Language Support for CodeMirror 6
// Supports Motorola 6809 and Hitachi 6309

import { StreamLanguage, StringStream } from "@codemirror/language";
import { LanguageSupport } from "@codemirror/language";

// 6809 Opcodes - full instruction set
const opcodes6809 = new Set([
  // Load/Store 8-bit
  "LDA", "LDB", "STA", "STB",
  // Load/Store 16-bit
  "LDD", "LDX", "LDY", "LDU", "LDS",
  "STD", "STX", "STY", "STU", "STS",
  // Load effective address
  "LEAX", "LEAY", "LEAU", "LEAS",
  // Transfer/Exchange
  "TFR", "EXG",
  // Stack operations
  "PSHS", "PULS", "PSHU", "PULU",
  // Arithmetic 8-bit
  "ADDA", "ADDB", "ADCA", "ADCB",
  "SUBA", "SUBB", "SBCA", "SBCB",
  "INCA", "INCB", "DECA", "DECB",
  "NEGA", "NEGB", "CLRA", "CLRB",
  "COMA", "COMB", "TSTA", "TSTB",
  "DAA", "SEX", "MUL", "ABX",
  // Arithmetic 16-bit
  "ADDD", "SUBD", "CMPD",
  // Compare
  "CMPA", "CMPB", "CMPX", "CMPY", "CMPU", "CMPS",
  // Logic
  "ANDA", "ANDB", "ORA", "ORB", "EORA", "EORB",
  "BITA", "BITB", "ANDCC", "ORCC",
  // Shift/Rotate
  "ASLA", "ASLB", "ASL", "ASRA", "ASRB", "ASR",
  "LSLA", "LSLB", "LSL", "LSRA", "LSRB", "LSR",
  "ROLA", "ROLB", "ROL", "RORA", "RORB", "ROR",
  // Memory
  "INC", "DEC", "NEG", "CLR", "COM", "TST",
  // Branch (short)
  "BRA", "BRN", "BHI", "BLS", "BCC", "BHS", "BCS", "BLO",
  "BNE", "BEQ", "BVC", "BVS", "BPL", "BMI", "BGE", "BLT",
  "BGT", "BLE", "BSR",
  // Branch (long)
  "LBRA", "LBRN", "LBHI", "LBLS", "LBCC", "LBHS", "LBCS", "LBLO",
  "LBNE", "LBEQ", "LBVC", "LBVS", "LBPL", "LBMI", "LBGE", "LBLT",
  "LBGT", "LBLE", "LBSR",
  // Jump/Return
  "JMP", "JSR", "RTS", "RTI",
  // Interrupt
  "SWI", "SWI2", "SWI3", "CWAI", "SYNC",
  // Misc
  "NOP",
]);

// 6309 additional opcodes (Hitachi)
const opcodes6309 = new Set([
  // Additional registers operations
  "LDMD", "BITMD", "LDBT", "STBT",
  // Additional arithmetic
  "ADCD", "SBCD", "ANDD", "ORD", "EORD",
  "MULD", "DIVD", "DIVQ",
  "ADCR", "SBCR", "ADDR", "SUBR", "ANDR", "ORR", "EORR", "CMPR",
  // Additional 16-bit
  "LDW", "STW", "LDQ", "STQ",
  "ADDW", "SUBW", "CMPW",
  "ADDE", "ADDF", "SUBE", "SUBF", "CMPE", "CMPF",
  "LDE", "LDF", "STE", "STF",
  // Transfer/Exchange extended
  "TFM", "PSHSW", "PULSW", "PSHUW", "PULUW",
  // Other
  "ASLD", "ASRD", "LSRD", "ROLD", "RORD",
  "CLRD", "CLRW", "COMD", "COMW",
  "DECD", "DECW", "INCD", "INCW",
  "NEGD", "NEGW", "TSTD", "TSTW",
  "SEXW", "BAND", "BIAND", "BOR", "BIOR",
  "BEOR", "BIEOR", "LDBT", "STBT",
]);

// Merge both sets
const allOpcodes = new Set([...opcodes6809, ...opcodes6309]);

// 6809 Registers
const registers = new Set([
  "A", "B", "D", "E", "F", "W",
  "X", "Y", "U", "S",
  "PC", "DP", "CC",
  "V", "Q",  // 6309 additional
]);

// Common assembler directives
const directives = new Set([
  "ORG", "EQU", "SET", "RMB", "FCB", "FCC", "FDB", "END",
  "SETDP", "INCLUDE", "INCBIN",
  ".ORG", ".EQU", ".SET", ".RMB", ".FCB", ".FCC", ".FDB", ".END",
  ".BYTE", ".WORD", ".ASCII", ".ASCIIZ", ".FILL", ".ALIGN",
  ".IF", ".ELSE", ".ENDIF", ".IFDEF", ".IFNDEF",
  ".MACRO", ".ENDM",
  ".EXPORT", ".IMPORT", ".GLOBAL",
  "NAM", "TTL", "OPT", "PAGE", "SPC",
]);

function tokenize6809(stream: StringStream): string | null {
  // Skip whitespace
  if (stream.eatSpace()) {
    return null;
  }

  // Comments (both ; and * at start of line)
  if (stream.match(";") || (stream.sol() && stream.match("*"))) {
    stream.skipToEnd();
    return "comment";
  }

  // Labels at start of line
  if (stream.sol()) {
    const labelMatch = stream.match(/^([A-Za-z_][A-Za-z0-9_@?]*)\s*/);
    if (labelMatch && typeof labelMatch !== 'boolean') {
      // Check if followed by EQU (then it's a constant definition)
      if (stream.match(/^EQU\s*/i, false)) {
        return "labelName";
      }
      // Check if this word itself is an opcode
      const word = labelMatch[1].toUpperCase();
      if (allOpcodes.has(word) || directives.has(word)) {
        stream.backUp(labelMatch[0].length);
      } else {
        return "labelName";
      }
    }
  }

  // Directives
  if (stream.match(/^\.[A-Za-z]+/i)) {
    const word = stream.current().toUpperCase();
    if (directives.has(word)) {
      return "meta";
    }
  }

  // Word token
  const wordMatch = stream.match(/^[A-Za-z_][A-Za-z0-9_@?]*/);
  if (wordMatch) {
    const word = stream.current().toUpperCase();
    if (allOpcodes.has(word)) {
      return "keyword";
    }
    if (directives.has(word)) {
      return "meta";
    }
    if (registers.has(word)) {
      return "variableName.special";
    }
    // Label reference
    return "variableName";
  }

  // Hex numbers ($xx or &H or 0x)
  if (stream.match(/^\$[0-9A-Fa-f]+/) || 
      stream.match(/^&[Hh][0-9A-Fa-f]+/) ||
      stream.match(/^0x[0-9A-Fa-f]+/i)) {
    return "number";
  }

  // Binary numbers (%...)
  if (stream.match(/^%[01]+/)) {
    return "number";
  }

  // Octal numbers (@...)
  if (stream.match(/^@[0-7]+/)) {
    return "number";
  }

  // Decimal numbers
  if (stream.match(/^#?-?\d+/)) {
    return "number";
  }

  // Immediate mode indicator
  if (stream.match("#")) {
    return "operator";
  }

  // Indexed mode indicators
  if (stream.match(/^[+-]+/)) {
    return "operator";
  }

  // Strings
  if (stream.match(/"[^"]*"/) || stream.match(/'[^']*'/)) {
    return "string";
  }

  // Character constant
  if (stream.match(/'./)) {
    return "string";
  }

  // Operators and punctuation
  if (stream.match(/^[+\-*/<>=&|^!~,()[\]]/)) {
    return "operator";
  }

  // Any other character
  stream.next();
  return null;
}

export const asm6809StreamLanguage = StreamLanguage.define({
  name: "asm6809",
  startState: () => ({}),
  token: tokenize6809,
  languageData: {
    commentTokens: { line: ";" },
    closeBrackets: { brackets: ["(", "[", '"', "'"] },
  },
});

export function asm6809(): LanguageSupport {
  return new LanguageSupport(asm6809StreamLanguage);
}
