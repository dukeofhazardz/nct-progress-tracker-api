/**
 * Turn a file the user picked into something the avatar endpoint accepts.
 *
 * The resizing happens here rather than on the server because the picture reaches
 * the API as base64 in a JSON body, on its way to a storage bucket — there is no
 * multipart upload and no image processing behind it. A phone photograph is several
 * megabytes; the API caps an upload at 64 KB decoded, so the browser does the work.
 */

/** Rendered at 80px at most, so 256px covers a 3× display with room to grow. */
const SIZE = 256;

/** Matches `AVATAR_LIMIT` in the API's `shared/profile.ts`. */
const MAX_BYTES = 64 * 1024;

/** Anything larger is a mistake — reject before spending memory decoding it. */
const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Tried in order until one lands under the limit. */
const QUALITIES = [0.78, 0.6, 0.45];

/** Decoded size of a base64 `data:` URL, without allocating the bytes. */
const decodedBytes = (dataUrl) => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

export const toAvatarDataUrl = async (file) => {
  if (!file) throw new Error('Choose an image file.');
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image. Choose a PNG, JPEG or WebP.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('That image is over 8 MB. Choose a smaller one.');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Formats the browser cannot decode land here — a HEIC straight off an iPhone
    // is the common one, and its MIME type passes the check above.
    throw new Error('That image could not be read. Try a PNG or JPEG.');
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;

    // Centre-crop to a square rather than squashing: every avatar in the app is
    // rendered in a circle, so a stretched face would be obvious.
    const side = Math.min(bitmap.width, bitmap.height);
    canvas
      .getContext('2d')
      .drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        SIZE,
        SIZE,
      );

    // JPEG rather than PNG: a photograph as a 256px PNG runs well past the limit.
    for (const quality of QUALITIES) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (decodedBytes(dataUrl) <= MAX_BYTES) return dataUrl;
    }

    // A 256×256 JPEG at 0.45 is a few kilobytes even for a noisy photograph, so
    // this guards against a browser ignoring the quality argument entirely.
    throw new Error('That image could not be compressed small enough. Try a simpler picture.');
  } finally {
    bitmap.close?.();
  }
};

export default toAvatarDataUrl;
