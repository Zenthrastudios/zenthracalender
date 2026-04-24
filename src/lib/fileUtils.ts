/**
 * Extract filename from a URL
 * Handles various URL formats including signed URLs with query parameters
 */
export function getFilenameFromUrl(url: string): string {
    if (!url) return '';

    try {
        // Remove query parameters
        const urlWithoutQuery = url.split('?')[0];

        // Get the last segment of the path
        const segments = urlWithoutQuery.split('/');
        let filename = segments[segments.length - 1];

        // Handle R2/S3 style URLs with timestamp prefix: 1234567890_filename.ext
        const timestampMatch = filename.match(/^\d+_(.+)$/);
        if (timestampMatch) {
            filename = timestampMatch[1];
        }

        // URL decode the filename
        filename = decodeURIComponent(filename);

        // Replace underscores with spaces for better readability
        // but keep file extension intact
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0) {
            const name = filename.substring(0, lastDotIndex).replace(/_/g, ' ');
            const ext = filename.substring(lastDotIndex);
            return name + ext;
        }

        return filename || 'Unknown file';
    } catch {
        return 'Unknown file';
    }
}

/**
 * Get a shortened version of the filename for display
 */
export function getShortFilename(url: string, maxLength: number = 30): string {
    const filename = getFilenameFromUrl(url);

    if (filename.length <= maxLength) {
        return filename;
    }

    // Get extension
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > 0) {
        const name = filename.substring(0, lastDotIndex);
        const ext = filename.substring(lastDotIndex);
        const availableLength = maxLength - ext.length - 3; // 3 for "..."

        if (availableLength > 5) {
            return name.substring(0, availableLength) + '...' + ext;
        }
    }

    return filename.substring(0, maxLength - 3) + '...';
}

/**
 * Get file extension from URL
 */
export function getFileExtension(url: string): string {
    const filename = getFilenameFromUrl(url);
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1).toLowerCase() : '';
}

/**
 * Get file type icon class based on extension
 */
export function getFileTypeFromExtension(url: string): 'video' | 'pdf' | 'doc' | 'image' | 'file' {
    const ext = getFileExtension(url);

    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'flv', 'wmv'];
    const pdfExts = ['pdf'];
    const docExts = ['doc', 'docx', 'txt', 'rtf', 'odt'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

    if (videoExts.includes(ext)) return 'video';
    if (pdfExts.includes(ext)) return 'pdf';
    if (docExts.includes(ext)) return 'doc';
    if (imageExts.includes(ext)) return 'image';
    return 'file';
}
