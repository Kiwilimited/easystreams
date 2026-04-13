/**
 * Helper to manipulate HLS manifests client-side.
 */

/**
 * Resolves a relative URL against a base URL.
 * Works in both Node.js and Browser environments.
 */
function resolveUrl(relative, base) {
    try {
        const baseUrl = new URL(base);
        const resolvedUrl = new URL(relative, base);
        
        // If the relative URL doesn't have its own query parameters, 
        // propagate them from the base URL (tokens are essential for Vixsrc)
        if (!resolvedUrl.search && baseUrl.search) {
            resolvedUrl.search = baseUrl.search;
        }
        
        return resolvedUrl.href;
    } catch (e) {
        // Fallback for very basic environments
        if (relative.startsWith('http')) return relative;
        const baseDir = base.substring(0, base.lastIndexOf('/') + 1);
        let finalUrl = baseDir + relative;
        if (!finalUrl.includes('?') && base.includes('?')) {
            finalUrl += base.substring(base.indexOf('?'));
        }
        return finalUrl;
    }
}

/**
 * Rewrites a Master M3U8 manifest to only include the highest quality stream.
 * Converts all relative URLs to absolute URLs.
 * 
 * @param {string} manifestText The original M3U8 content
 * @param {string} masterUrl The URL where the manifest was fetched from
 * @returns {string} The modified M3U8 content
 */
function rewriteMasterManifest(manifestText, masterUrl) {
    if (!manifestText || !manifestText.includes('#EXTM3U')) return manifestText;

    const lines = manifestText.split(/\r?\n/);
    const resultLines = [];
    const variants = [];

    let currentVariant = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            // Found a variant
            const info = line;
            const urlLine = lines[i + 1] ? lines[i + 1].trim() : '';
            
            if (urlLine && !urlLine.startsWith('#')) {
                const resolutionMatch = info.match(/RESOLUTION=(\d+)x(\d+)/i);
                const bandwidthMatch = info.match(/BANDWIDTH=(\d+)/i);
                
                const resolution = resolutionMatch ? parseInt(resolutionMatch[2]) : 0;
                const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0;
                
                variants.push({
                    info,
                    url: resolveUrl(urlLine, masterUrl),
                    resolution,
                    bandwidth,
                    originalIndex: i
                });
                i++; // Skip the URL line
            }
        } else if (line.startsWith('#EXT-X-MEDIA:')) {
            // Resolve URLs in media tags (Audio/Subtitles)
            const rewrittenMedia = line.replace(/(URI=")([^"]+)(")/g, (match, prefix, uri, suffix) => {
                return prefix + resolveUrl(uri, masterUrl) + suffix;
            });
            resultLines.push(rewrittenMedia);
        } else if (line.startsWith('#') && !line.startsWith('#EXT-X-I-FRAME-STREAM-INF')) {
            // Keep other global tags (EXTM3U, VERSION, etc.)
            resultLines.push(line);
        }
    }

    if (variants.length > 0) {
        // Sort by resolution then bandwidth descending
        variants.sort((a, b) => {
            if (b.resolution !== a.resolution) return b.resolution - a.resolution;
            return b.bandwidth - a.bandwidth;
        });

        const best = variants[0];
        
        // Add the best variant
        resultLines.push(best.info);
        resultLines.push(best.url);
    }

    return resultLines.join('\n');
}

/**
 * Converts a string to a Base64 Data URL for M3U8.
 */
function toM3u8DataUrl(content) {
    const base64 = typeof btoa !== 'undefined' 
        ? btoa(unescape(encodeURIComponent(content))) 
        : Buffer.from(content).toString('base64');
    return `data:application/vnd.apple.mpegurl;base64,${base64}`;
}

module.exports = {
    rewriteMasterManifest,
    toM3u8DataUrl
};
