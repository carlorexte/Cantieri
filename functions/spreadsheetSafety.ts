const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const textDecoder = new TextDecoder();

function readUint16LE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function readUint32LE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function looksLikeZip(bytes: Uint8Array) {
  return bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
}

function isSuspiciousEntryName(fileName: string) {
  return fileName.includes('..') || fileName.startsWith('/') || fileName.startsWith('\\') || fileName.includes(':');
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const minLength = 22;
  if (bytes.length < minLength) return -1;

  const start = Math.max(0, bytes.length - 65557);
  for (let index = bytes.length - minLength; index >= start; index -= 1) {
    if (
      bytes[index] === 0x50 &&
      bytes[index + 1] === 0x4b &&
      bytes[index + 2] === 0x05 &&
      bytes[index + 3] === 0x06
    ) {
      return index;
    }
  }

  return -1;
}

function assertSafeZip(bytes: Uint8Array) {
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset === -1) {
    throw new Error('Archivio spreadsheet non valido.');
  }

  const totalEntries = readUint16LE(bytes, eocdOffset + 10);
  const centralDirectorySize = readUint32LE(bytes, eocdOffset + 12);
  const centralDirectoryOffset = readUint32LE(bytes, eocdOffset + 16);

  if (totalEntries > MAX_ZIP_ENTRIES) {
    throw new Error('Spreadsheet rifiutato: troppe entry compresse.');
  }

  if (centralDirectoryOffset + centralDirectorySize > bytes.length) {
    throw new Error('Spreadsheet rifiutato: archivio ZIP corrotto.');
  }

  let cursor = centralDirectoryOffset;
  let totalUncompressed = 0;

  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    if (cursor + 46 > bytes.length) {
      throw new Error('Spreadsheet rifiutato: central directory incompleta.');
    }

    if (
      bytes[cursor] !== 0x50 ||
      bytes[cursor + 1] !== 0x4b ||
      bytes[cursor + 2] !== 0x01 ||
      bytes[cursor + 3] !== 0x02
    ) {
      throw new Error('Spreadsheet rifiutato: entry ZIP non valida.');
    }

    const compressedSize = readUint32LE(bytes, cursor + 20);
    const uncompressedSize = readUint32LE(bytes, cursor + 24);
    const fileNameLength = readUint16LE(bytes, cursor + 28);
    const extraLength = readUint16LE(bytes, cursor + 30);
    const commentLength = readUint16LE(bytes, cursor + 32);

    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > bytes.length) {
      throw new Error('Spreadsheet rifiutato: nome entry fuori limite.');
    }

    const fileName = textDecoder.decode(bytes.slice(fileNameStart, fileNameEnd));
    if (isSuspiciousEntryName(fileName)) {
      throw new Error('Spreadsheet rifiutato: path interno sospetto.');
    }

    if (uncompressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES || compressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error('Spreadsheet rifiutato: entry troppo grande.');
    }

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error('Spreadsheet rifiutato: dimensione espansa eccessiva.');
    }

    cursor = fileNameEnd + extraLength + commentLength;
  }
}

export function assertSafeSpreadsheetBytes(bytes: Uint8Array) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new Error('Spreadsheet vuoto o non valido.');
  }

  if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error('Spreadsheet rifiutato: file troppo grande.');
  }

  if (looksLikeZip(bytes)) {
    assertSafeZip(bytes);
  }
}
