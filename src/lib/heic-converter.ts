import heic2any from 'heic2any';

/**
 * Convert HEIC/HEIF image to JPEG
 * Browsers cannot natively display HEIC images, so we need to convert them
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const fileName = file.name.toLowerCase();
  const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
                 file.type === 'image/heic' || file.type === 'image/heif';

  // If not HEIC, return original file
  if (!isHEIC) {
    return file;
  }

  try {
    console.log('Converting HEIC to JPEG:', file.name);

    // Convert HEIC to JPEG blob
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9, // High quality JPEG
    });

    // heic2any might return an array of blobs for multi-page HEIC
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    // Create a new File from the converted blob
    const convertedFile = new File(
      [blob],
      file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
      {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }
    );

    console.log('✅ HEIC converted to JPEG:', {
      originalSize: file.size,
      convertedSize: convertedFile.size,
      originalName: file.name,
      convertedName: convertedFile.name,
    });

    return convertedFile;
  } catch (error) {
    console.error('Failed to convert HEIC:', error);
    throw new Error('Failed to process HEIC image. Please try converting to JPEG first or use a different image.');
  }
}

/**
 * Convert multiple files, handling HEIC conversion
 */
export async function convertFilesIfNeeded(files: File[]): Promise<File[]> {
  const convertedFiles: File[] = [];

  for (const file of files) {
    try {
      const convertedFile = await convertHeicToJpeg(file);
      convertedFiles.push(convertedFile);
    } catch (error) {
      console.error('Error converting file:', file.name, error);
      // Still include the original file if conversion fails
      // The upload function will handle the error
      convertedFiles.push(file);
    }
  }

  return convertedFiles;
}
