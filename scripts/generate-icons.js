// Simple script to generate placeholder icons for Tauri
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CRC32 implementation for PNG
function crc32(data) {
    let crc = 0xffffffff;
    const table = [];

    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }

    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }

    return crc ^ 0xffffffff;
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function createPNG(width, height, r, g, b) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 2;  // color type (RGB)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = createChunk('IHDR', ihdrData);

    const rawData = [];
    for (let y = 0; y < height; y++) {
        rawData.push(0); // filter type: none
        for (let x = 0; x < width; x++) {
            // Create a simple "R" logo pattern
            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) * 0.4;
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            if (dist < radius) {
                // Inside circle - check for "R" shape
                const rx = (x - cx) / radius;
                const ry = (y - cy) / radius;

                // Simple R shape detection
                const inR = (
                    // Vertical bar
                    (rx >= -0.4 && rx <= -0.2 && ry >= -0.5 && ry <= 0.5) ||
                    // Top horizontal
                    (rx >= -0.4 && rx <= 0.3 && ry >= -0.5 && ry <= -0.35) ||
                    // Middle horizontal
                    (rx >= -0.4 && rx <= 0.2 && ry >= -0.1 && ry <= 0.05) ||
                    // Right arc top
                    (rx >= 0.15 && rx <= 0.35 && ry >= -0.5 && ry <= 0.0) ||
                    // Diagonal
                    (ry >= 0.0 && ry <= 0.5 && rx >= -0.2 + ry * 0.8 && rx <= 0.0 + ry * 0.8)
                );

                if (inR) {
                    rawData.push(0xcc, 0xcc, 0xcc); // Light gray for letter
                } else {
                    rawData.push(0x0e, 0x63, 0x9c); // Blue background
                }
            } else {
                rawData.push(r, g, b); // Dark background
            }
        }
    }

    const compressed = deflateSync(Buffer.from(rawData));
    const idat = createChunk('IDAT', compressed);
    const iend = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
}

function main() {
    const iconsDir = join(__dirname, '..', 'src-tauri', 'icons');
    const bg = { r: 0x1e, g: 0x1e, b: 0x1e }; // Dark background

    console.log('Generating placeholder icons...');

    // Generate required sizes
    const icons = [
        { size: 32, name: '32x32.png' },
        { size: 128, name: '128x128.png' },
        { size: 256, name: '128x128@2x.png' },
    ];

    for (const { size, name } of icons) {
        const png = createPNG(size, size, bg.r, bg.g, bg.b);
        writeFileSync(join(iconsDir, name), png);
        console.log(`  Created ${name} (${size}x${size})`);
    }

    // Also create a 512x512 for icon generation source
    const sourcePng = createPNG(512, 512, bg.r, bg.g, bg.b);
    writeFileSync(join(iconsDir, 'app-icon.png'), sourcePng);
    console.log('  Created app-icon.png (512x512) - use this for icon generation');

    console.log('\nPlaceholder icons created!');
    console.log('For production-quality icons, run:');
    console.log('  npm run tauri icon path/to/your-1024x1024-icon.png');
}

main();
