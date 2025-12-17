// BASIC Language Support for CodeMirror 6
// Supports multiple BASIC dialects:
// - Microsoft BASIC (generic)
// - Tandy/TRS-80 Color Computer Extended Color BASIC
// - Commodore BASIC (C64, VIC-20, etc.)

import { StreamLanguage, StringStream } from "@codemirror/language";
import { LanguageSupport } from "@codemirror/language";

// Core BASIC keywords shared across dialects
const coreKeywords = new Set([
  // Program control
  "GOTO", "GOSUB", "RETURN", "IF", "THEN", "ELSE", "FOR", "TO", "STEP",
  "NEXT", "WHILE", "WEND", "DO", "LOOP", "UNTIL", "END", "STOP", "ON",
  // I/O
  "PRINT", "INPUT", "READ", "DATA", "RESTORE", "GET", "PUT",
  // Variables
  "LET", "DIM", "DEF", "FN", "DEFINT", "DEFSNG", "DEFDBL", "DEFSTR",
  // Strings
  "LEFT$", "RIGHT$", "MID$", "LEN", "CHR$", "ASC", "VAL", "STR$",
  "INSTR", "STRING$", "SPACE$",
  // Math
  "ABS", "INT", "SGN", "SQR", "SIN", "COS", "TAN", "ATN", "LOG", "EXP",
  "RND", "FIX", "CINT", "CSNG", "CDBL",
  // Misc
  "REM", "NEW", "RUN", "LIST", "CLEAR", "CLR", "CLS",
  "CONT", "LOAD", "SAVE", "VERIFY",
  "TAB", "SPC", "USING", "POS",
  "AND", "OR", "NOT", "XOR", "EQV", "IMP", "MOD",
  "PEEK", "POKE", "USR", "CALL", "WAIT",
]);

// Extended Color BASIC (TRS-80 CoCo) specific keywords
const ecbKeywords = new Set([
  // Graphics
  "PMODE", "PCLS", "PCLEAR", "SCREEN", "COLOR", "SET", "RESET", "POINT",
  "LINE", "PSET", "PRESET", "CIRCLE", "PAINT", "DRAW", "GET", "PUT",
  "PALETTE",
  // Sound
  "SOUND", "PLAY", "AUDIO",
  // Disk I/O (Disk Extended Color BASIC)
  "OPEN", "CLOSE", "PRINT#", "INPUT#", "LINE INPUT#",
  "LOF", "LOC", "EOF", "FIELD", "LSET", "RSET",
  "WRITE", "WRITE#", "APPEND",
  "KILL", "NAME", "FILES", "DSKI$", "DSKO$",
  "DRIVE", "DIR", "COPY", "BACKUP", "UNLOAD",
  // Extended
  "EXEC", "DEF USR", "VARPTR", "INKEY$", "TIMER",
  "ATTR$", "BUTTON", "JOYSTK",
  "HSCREEN", "HSET", "HRESET", "HPOINT", "HLINE", "HCIRCLE",
  "HDRAW", "HPAINT", "HCOLOR", "HBUFF", "HGET", "HPUT", "HCLS", "HPRINT",
  "LOCATE", "WIDTH", "EDIT", "TRON", "TROFF",
  "MOTOR", "SKIPF", "RENUM", "HEXS", "DELETE", "AUTO",
  "CSAVE", "CLOAD", "LLIST", "LPRINT",
]);

// Commodore BASIC specific keywords
const commodoreKeywords = new Set([
  // Graphics/Screen
  "COLOR", "GRAPHIC", "SCNCLR", "CHAR", "BOX", "CIRCLE", "DRAW", "PAINT",
  "LOCATE", "SCALE", "GSHAPE", "SSHAPE", "COLLISION", "SPRITE", "MOVSPR",
  "SPRSAV", "SPRDEF", "SPRCOLOR", "BUMP", "RSPRITE", "RSPPOS", "RSPCOL",
  // Sound
  "SOUND", "VOL", "ENVELOPE", "TEMPO", "PLAY", "FILTER", "COLLISION",
  // I/O
  "OPEN", "CLOSE", "PRINT#", "INPUT#", "GET#", "CMD",
  "STATUS", "ST", "DS", "DS$",
  // Disk
  "LOAD", "SAVE", "VERIFY", "DLOAD", "DSAVE", "CATALOG", "DIRECTORY",
  "SCRATCH", "RENAME", "COPY", "CONCAT", "COLLECT", "BACKUP", "HEADER",
  "DCLEAR", "DOPEN", "DCLOSE", "RECORD", "APPEND",
  // Extended
  "SYS", "WAIT", "BANK", "FRE", "TI", "TI$",
  "RWINDOW", "WINDOW", "CHAR", "RREG",
  "TRAP", "RESUME", "SLEEP", "BEGIN", "BEND",
  "BLOAD", "BSAVE", "BOOT", "FETCH", "STASH", "SWAP",
  "DEC", "HEX$", "ERR$", "EL", "ER", "INSTR",
  "JOY", "POT", "PEN", "RCLR", "RDOT", "RGR", "RLUM",
  "POINTER", "SET DEF", "KEY",
  "FAST", "SLOW",
]);

// Combine all keywords
const allKeywords = new Set([
  ...coreKeywords,
  ...ecbKeywords,
  ...commodoreKeywords,
]);

// Built-in functions that might not be covered above
const functions = new Set([
  "ABS", "ASC", "ATN", "CHR$", "COS", "EXP", "FRE", "INT", "LEFT$",
  "LEN", "LOG", "MID$", "PEEK", "POS", "RIGHT$", "RND", "SGN", "SIN",
  "SPC", "SQR", "STR$", "TAB", "TAN", "USR", "VAL", "VARPTR",
  "INKEY$", "POINT", "JOYSTK", "MEM", "TIMER", "ERR", "ERL",
  "STRING$", "HEX$", "OCT$", "BIN$", "INSTR",
]);

interface BasicState {
  inString: boolean;
  stringChar: string;
  afterLineNumber: boolean;
}

function tokenizeBasic(stream: StringStream, state: BasicState): string | null {
  // Handle string continuation
  if (state.inString) {
    while (!stream.eol()) {
      const ch = stream.next();
      if (ch === state.stringChar) {
        state.inString = false;
        return "string";
      }
    }
    return "string";
  }

  // Skip whitespace
  if (stream.eatSpace()) {
    return null;
  }

  // Line numbers at start
  if (stream.sol()) {
    state.afterLineNumber = false;
    if (stream.match(/^\d+/)) {
      state.afterLineNumber = true;
      return "number";
    }
  }

  // REM comments (eat rest of line)
  if (stream.match(/^REM\b/i)) {
    stream.skipToEnd();
    return "comment";
  }

  // Single quote comment (some BASIC variants)
  if (stream.match("'")) {
    stream.skipToEnd();
    return "comment";
  }

  // Strings
  if (stream.match('"')) {
    state.inString = true;
    state.stringChar = '"';
    while (!stream.eol()) {
      if (stream.next() === '"') {
        state.inString = false;
        break;
      }
    }
    return "string";
  }

  // Hex numbers (&H...)
  if (stream.match(/^&[Hh][0-9A-Fa-f]+/)) {
    return "number";
  }

  // Octal numbers (&O...)
  if (stream.match(/^&[Oo][0-7]+/)) {
    return "number";
  }

  // Binary numbers (&B...)
  if (stream.match(/^&[Bb][01]+/)) {
    return "number";
  }

  // Decimal numbers (including scientific notation)
  if (stream.match(/^-?\d*\.?\d+([Ee][+-]?\d+)?[!#%&]?/)) {
    return "number";
  }

  // Type suffixes on variables
  if (stream.match(/^[A-Za-z][A-Za-z0-9]*[$%!#&]/)) {
    return "variableName";
  }

  // Keywords and identifiers
  if (stream.match(/^[A-Za-z][A-Za-z0-9]*/)) {
    const word = stream.current().toUpperCase();

    // Check for function followed by $ (string functions)
    if (stream.peek() === "$") {
      stream.next();
      const withDollar = word + "$";
      if (functions.has(withDollar) || allKeywords.has(withDollar)) {
        return "keyword";
      }
      stream.backUp(1);
    }

    if (allKeywords.has(word)) {
      return "keyword";
    }
    if (functions.has(word)) {
      return "keyword";
    }
    return "variableName";
  }

  // Operators
  if (stream.match(/^[+\-*\/\\^=<>(),:;@#$%!&]/)) {
    return "operator";
  }

  // Comparison operators
  if (stream.match(/^(<>|<=|>=|><)/)) {
    return "operator";
  }

  // Any other character
  stream.next();
  return null;
}

export const basicStreamLanguage = StreamLanguage.define({
  name: "basic",
  startState: (): BasicState => ({
    inString: false,
    stringChar: "",
    afterLineNumber: false,
  }),
  token: tokenizeBasic,
  languageData: {
    commentTokens: { line: "REM " },
    closeBrackets: { brackets: ["(", '"'] },
  },
});

// Language support factory
export function basic(): LanguageSupport {
  return new LanguageSupport(basicStreamLanguage);
}

// Dialect-specific exports (same parser, different name for clarity)
export function extendedColorBasic(): LanguageSupport {
  return new LanguageSupport(basicStreamLanguage);
}

export function commodoreBasic(): LanguageSupport {
  return new LanguageSupport(basicStreamLanguage);
}
