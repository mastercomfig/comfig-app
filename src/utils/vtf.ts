// VTF (Valve Texture Format) file generator
// Based on VTF specification from Valve Developer Community

const VTF_VERSION_MAJOR = 7;
const VTF_VERSION_MINOR = 2;
const VTF_SIGNATURE = 0x00465456; // "VTF\0"

// Image format enum
enum ImageFormat {
  RGBA8888 = 0,
  ABGR8888 = 1,
  RGB888 = 2,
  BGR888 = 3,
  RGB565 = 4,
  I8 = 5,
  IA88 = 6,
  P8 = 7,
  A8 = 8,
  RGB888_BLUESCREEN = 9,
  BGR888_BLUESCREEN = 10,
  ARGB8888 = 11,
  BGRA8888 = 12,
  DXT1 = 13,
  DXT3 = 14,
  DXT5 = 15,
  BGRX8888 = 16,
  BGR565 = 17,
  BGRX5551 = 18,
  BGRA4444 = 19,
  DXT1_ONEBITALPHA = 20,
  BGRA5551 = 21,
  UV88 = 22,
  UVWQ8888 = 23,
  RGBA16161616F = 24,
  RGBA16161616 = 25,
  UVLX8888 = 26,
}

// VTF flags
enum VTFFlags {
  POINTSAMPLE = 0x00000001,
  TRILINEAR = 0x00000002,
  CLAMPS = 0x00000004,
  CLAMPT = 0x00000008,
  ANISOTROPIC = 0x00000010,
  HINT_DXT5 = 0x00000020,
  SRGB = 0x00000040,
  NORMAL = 0x00000080,
  NOMIP = 0x00000100,
  NOLOD = 0x00000200,
  MINMIP = 0x00000400,
  PROCEDURAL = 0x00000800,
  ONEBITALPHA = 0x00001000,
  EIGHTBITALPHA = 0x00002000,
  ENVMAP = 0x00004000,
  RENDERTARGET = 0x00008000,
  DEPTHRENDERTARGET = 0x00010000,
  NODEBUGOVERRIDE = 0x00020000,
  SINGLECOPY = 0x00040000,
  ONEOVERMIPLEVELINALPHA = 0x00080000,
  PREMULTCOLORALPHA = 0x00100000,
  NORMALTODUDV = 0x00200000,
  ALPHATESTMIPGENERATION = 0x00400000,
  NODEPTHBUFFER = 0x00800000,
  NICEFILTERED = 0x01000000,
  CLAMPU = 0x02000000,
  VERTEXTEXTURE = 0x04000000,
  SSBUMP = 0x08000000,
  BORDER = 0x20000000,
}

interface VTFHeader {
  signature: number;
  versionMajor: number;
  versionMinor: number;
  headerSize: number;
  width: number;
  height: number;
  flags: number;
  frames: number;
  firstFrame: number;
  padding0: number;
  reflectivityR: number;
  reflectivityG: number;
  reflectivityB: number;
  padding1: number;
  bumpMapScale: number;
  highResImageFormat: ImageFormat;
  mipmapCount: number;
  lowResImageFormat: ImageFormat;
  lowResImageWidth: number;
  lowResImageHeight: number;
}

/**
 * Calculate the number of mipmaps for an image
 */
function calculateMipmapCount(width: number, height: number): number {
  return Math.floor(Math.log(Math.max(width, height)) / Math.log(2)) + 1;
}

/**
 * Convert RGBA image data to BGRA format
 */
function rgbaToBgra(data: Uint8ClampedArray): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    result[i] = data[i + 2]; // B
    result[i + 1] = data[i + 1]; // G
    result[i + 2] = data[i]; // R
    result[i + 3] = data[i + 3]; // A
  }
  return result;
}

/**
 * Generate a mipmap level
 */
function generateMipmap(
  data: Uint8Array,
  width: number,
  height: number,
): { data: Uint8Array; width: number; height: number } {
  const newWidth = Math.max(1, Math.floor(width / 2));
  const newHeight = Math.max(1, Math.floor(height / 2));
  const newData = new Uint8Array(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const sx = x * 2;
      const sy = y * 2;

      // Sample 4 pixels
      const idx1 = (sy * width + sx) * 4;
      const idx2 = (sy * width + sx + 1) * 4;
      const idx3 = ((sy + 1) * width + sx) * 4;
      const idx4 = ((sy + 1) * width + sx + 1) * 4;

      const targetIdx = (y * newWidth + x) * 4;

      // Average the pixels
      for (let c = 0; c < 4; c++) {
        newData[targetIdx + c] = Math.floor(
          (data[idx1 + c] +
            data[idx2 + c] +
            data[idx3 + c] +
            data[idx4 + c]) /
            4,
        );
      }
    }
  }

  return { data: newData, width: newWidth, height: newHeight };
}

/**
 * Create a VTF file from image data
 * @param imageData - RGBA image data from canvas
 * @param width - Image width (should be power of 2)
 * @param height - Image height (should be power of 2)
 */
export function createVTF(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  // Validate dimensions are power of 2
  const log2Width = Math.log(width) / Math.log(2);
  const log2Height = Math.log(height) / Math.log(2);
  if (log2Width !== Math.floor(log2Width) || log2Height !== Math.floor(log2Height)) {
    throw new Error("Width and height must be powers of 2");
  }

  const mipmapCount = calculateMipmapCount(width, height);
  const flags =
    VTFFlags.POINTSAMPLE |
    VTFFlags.CLAMPS |
    VTFFlags.CLAMPT |
    VTFFlags.NOMIP |
    VTFFlags.NOLOD;

  // Convert RGBA to BGRA
  let currentData = rgbaToBgra(imageData);
  let currentWidth = width;
  let currentHeight = height;

  // Generate mipmaps
  const mipmaps: Uint8Array[] = [currentData];
  for (let i = 1; i < mipmapCount; i++) {
    const mipmap = generateMipmap(currentData, currentWidth, currentHeight);
    mipmaps.push(mipmap.data);
    currentData = mipmap.data;
    currentWidth = mipmap.width;
    currentHeight = mipmap.height;
  }

  // Calculate total size
  const headerSize = 80; // VTF 7.2 header size
  let dataSize = 0;
  for (const mipmap of mipmaps) {
    dataSize += mipmap.length;
  }
  const totalSize = headerSize + dataSize;

  // Create buffer
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  // Write header
  view.setUint32(offset, VTF_SIGNATURE, true);
  offset += 4;
  view.setUint32(offset, VTF_VERSION_MAJOR, true);
  offset += 4;
  view.setUint32(offset, VTF_VERSION_MINOR, true);
  offset += 4;
  view.setUint32(offset, headerSize, true);
  offset += 4;
  view.setUint16(offset, width, true);
  offset += 2;
  view.setUint16(offset, height, true);
  offset += 2;
  view.setUint32(offset, flags, true);
  offset += 4;
  view.setUint16(offset, 1, true); // frames
  offset += 2;
  view.setUint16(offset, 0, true); // firstFrame
  offset += 2;
  offset += 4; // padding0
  view.setFloat32(offset, 1.0, true); // reflectivityR
  offset += 4;
  view.setFloat32(offset, 1.0, true); // reflectivityG
  offset += 4;
  view.setFloat32(offset, 1.0, true); // reflectivityB
  offset += 4;
  offset += 4; // padding1
  view.setFloat32(offset, 1.0, true); // bumpMapScale
  offset += 4;
  view.setUint32(offset, ImageFormat.BGRA8888, true); // highResImageFormat
  offset += 4;
  view.setUint8(offset, mipmapCount); // mipmapCount
  offset += 1;
  view.setUint32(offset, ImageFormat.BGRA8888, true); // lowResImageFormat
  offset += 4;
  view.setUint8(offset, width); // lowResImageWidth
  offset += 1;
  view.setUint8(offset, height); // lowResImageHeight
  offset += 1;

  // Write image data (mipmaps in reverse order - smallest first)
  const uint8View = new Uint8Array(buffer);
  for (let i = mipmaps.length - 1; i >= 0; i--) {
    uint8View.set(mipmaps[i], offset);
    offset += mipmaps[i].length;
  }

  return new Uint8Array(buffer);
}

/**
 * Load an image file and convert it to VTF format
 * Automatically resizes to nearest power of 2
 */
export async function imageToVTF(
  file: File,
  maxSize: number = 64,
): Promise<{ vtf: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Calculate target size (power of 2)
        const maxDim = Math.max(img.width, img.height);
        const targetSize = Math.min(
          maxSize,
          Math.pow(
            2,
            Math.floor(Math.log(maxDim) / Math.log(2)),
          ),
        );

        // Create canvas to resize and get image data
        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw image centered and scaled
        const scale = Math.min(
          targetSize / img.width,
          targetSize / img.height,
        );
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (targetSize - scaledWidth) / 2;
        const y = (targetSize - scaledHeight) / 2;

        // Clear with transparency
        ctx.clearRect(0, 0, targetSize, targetSize);
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        // Get image data
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);

        // Create VTF
        const vtf = createVTF(imageData.data, targetSize, targetSize);

        resolve({ vtf, width: targetSize, height: targetSize });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}
