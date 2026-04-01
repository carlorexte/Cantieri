const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_FILE_SIGNATURE = 0x02014b50;

const DEFAULT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxEntries: 512,
  maxTotalUncompressedBytes: 50 * 1024 * 1024,
  maxEntryNameLength: 240,
};

function normalizeToUint8Array(fileBuffer) {
  if (fileBuffer instanceof Uint8Array) return fileBuffer;
  if (fileBuffer instanceof ArrayBuffer) return new Uint8Array(fileBuffer);
  if (ArrayBuffer.isView(fileBuffer)) {
    return new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
  }
  throw new Error('Formato file non supportato per la validazione sicurezza');
}

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 0xffff - 22);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_EOCD_SIGNATURE) {
      return offset;
    }
  }
  return -1;
}

function hasSafeZipEntryName(name, limits) {
  if (!name || name.length > limits.maxEntryNameLength) return false;
  if (name.includes('..')) return false;
  if (name.includes('\\')) return false;
  if (name.startsWith('/')) return false;
  return true;
}

function inspectZipContainer(bytes, limits) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);

  if (eocdOffset === -1) {
    throw new Error('Archivio ZIP del foglio non valido o corrotto');
  }

  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralDirectorySize = view.getUint32(eocdOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);

  if (entryCount <= 0 || entryCount > limits.maxEntries) {
    throw new Error('Foglio rifiutato: numero di entry ZIP non sicuro');
  }

  if (centralDirectoryOffset + centralDirectorySize > bytes.byteLength) {
    throw new Error('Foglio rifiutato: directory ZIP incoerente');
  }

  let cursor = centralDirectoryOffset;
  let totalUncompressedBytes = 0;
  let inspectedEntries = 0;

  while (cursor < centralDirectoryOffset + centralDirectorySize && inspectedEntries < entryCount) {
    if (view.getUint32(cursor, true) !== ZIP_CENTRAL_FILE_SIGNATURE) {
      throw new Error('Foglio rifiutato: entry ZIP centrale non valida');
    }

    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);

    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > bytes.byteLength) {
      throw new Error('Foglio rifiutato: nome entry ZIP fuori range');
    }

    const entryName = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(nameStart, nameEnd));
    if (!hasSafeZipEntryName(entryName, limits)) {
      throw new Error(`Foglio rifiutato: entry ZIP sospetta (${entryName || 'vuota'})`);
    }

    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
      throw new Error('Foglio rifiutato: contenuto espanso eccessivo');
    }

    if (compressedSize === 0 && uncompressedSize > 0) {
      throw new Error(`Foglio rifiutato: entry ZIP anomala (${entryName})`);
    }

    cursor = nameEnd + extraLength + commentLength;
    inspectedEntries += 1;
  }

  if (inspectedEntries !== entryCount) {
    throw new Error('Foglio rifiutato: archivio ZIP incompleto');
  }
}

export function assertSafeSpreadsheetBuffer(fileBuffer, customLimits = {}) {
  const limits = { ...DEFAULT_LIMITS, ...customLimits };
  const bytes = normalizeToUint8Array(fileBuffer);

  if (bytes.byteLength <= 0) {
    throw new Error('File foglio vuoto');
  }

  if (bytes.byteLength > limits.maxBytes) {
    throw new Error(`File foglio troppo grande (${Math.ceil(bytes.byteLength / (1024 * 1024))}MB)`);
  }

  const isZip =
    bytes.byteLength >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08);

  if (isZip) {
    inspectZipContainer(bytes, limits);
  }

  return true;
}

export default assertSafeSpreadsheetBuffer;
