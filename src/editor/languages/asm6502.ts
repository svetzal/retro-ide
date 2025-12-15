// 6502 Assembly Language Support for CodeMirror 6
// Supports common 6502 variants (MOS 6502, 65C02, etc.)

import { LanguageSupport } from "@codemirror/language";
import { asm6502StreamLanguage } from "./asm6502-parser";

// 6502 Opcodes - standard instruction set
export const opcodes6502 = [
  // Load/Store
  "LDA", "LDX", "LDY", "STA", "STX", "STY",
  // Transfer
  "TAX", "TAY", "TXA", "TYA", "TSX", "TXS",
  // Stack
  "PHA", "PHP", "PLA", "PLP",
  // Arithmetic
  "ADC", "SBC", "INC", "INX", "INY", "DEC", "DEX", "DEY",
  // Logic
  "AND", "ORA", "EOR", "BIT",
  // Shift/Rotate
  "ASL", "LSR", "ROL", "ROR",
  // Compare
  "CMP", "CPX", "CPY",
  // Branch
  "BCC", "BCS", "BEQ", "BMI", "BNE", "BPL", "BVC", "BVS",
  // Jump
  "JMP", "JSR", "RTS", "RTI", "BRK",
  // Flags
  "CLC", "CLD", "CLI", "CLV", "SEC", "SED", "SEI",
  // No-op
  "NOP",
];

// 65C02 additional opcodes
export const opcodes65C02 = [
  "BRA", "PHX", "PHY", "PLX", "PLY", "STZ", "TRB", "TSB",
  "BBR0", "BBR1", "BBR2", "BBR3", "BBR4", "BBR5", "BBR6", "BBR7",
  "BBS0", "BBS1", "BBS2", "BBS3", "BBS4", "BBS5", "BBS6", "BBS7",
  "RMB0", "RMB1", "RMB2", "RMB3", "RMB4", "RMB5", "RMB6", "RMB7",
  "SMB0", "SMB1", "SMB2", "SMB3", "SMB4", "SMB5", "SMB6", "SMB7",
];

// Common assembler directives
export const directives6502 = [
  ".ORG", ".BYTE", ".WORD", ".DWORD", ".FILL", ".ALIGN",
  ".DB", ".DW", ".DD", ".DS", ".EQU", ".SET",
  ".INCLUDE", ".INCBIN", ".IF", ".ELSE", ".ENDIF", ".IFDEF", ".IFNDEF",
  ".MACRO", ".ENDM", ".ENDMACRO", ".REPT", ".ENDR",
  ".SEGMENT", ".CODE", ".DATA", ".BSS", ".RODATA",
  ".PROC", ".ENDPROC", ".SCOPE", ".ENDSCOPE",
  ".EXPORT", ".IMPORT", ".GLOBAL", ".LOCAL",
  ".ASSERT", ".WARNING", ".ERROR",
  "ORG", "EQU", "DB", "DW", "DS", "BYTE", "WORD",
];

// Registers
export const registers6502 = ["A", "X", "Y", "S", "SP", "PC"];

// Create the language support
export function asm6502(): LanguageSupport {
  return new LanguageSupport(asm6502StreamLanguage);
}
