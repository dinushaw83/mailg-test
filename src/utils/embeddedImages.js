import { generateRandomId } from "./helperFunctions";

/**
 * Store an embedded image file in IndexedDB
 * @param {any} db - IndexedDB database instance from idb library
 * @param {File} file - The image file to store
 * @param {string} emailId - The email ID this image belongs to
 * @returns {Promise<{id: string, url: string}>} - The stored image metadata
 */
export const storeEmbeddedImage = async (db, file, emailId) => {
  if (!db) {
    throw new Error("Database not available");
  }

  const id = generateRandomId();
  const url = URL.createObjectURL(file);

  const imageData = {
    id,
    emailId,
    file,
    url,
    name: file.name,
    size: file.size,
    type: file.type,
    timestamp: new Date().toISOString(),
  };

  await db.put("embeddedImages", imageData);

  return { id, url };
};

/**
 * Retrieve an embedded image from IndexedDB and create a new object URL
 * @param {any} db - IndexedDB database instance from idb library
 * @param {string} imageId - The image ID to retrieve
 * @returns {Promise<{id: string, url: string, file: File}>} - The retrieved image data
 */
export const getEmbeddedImage = async (db, imageId) => {
  if (!db) {
    throw new Error("Database not available");
  }

  const imageData = await db.get("embeddedImages", imageId);
  if (!imageData) {
    throw new Error(`Image with ID ${imageId} not found`);
  }

  // Create a new object URL for the stored file
  const url = URL.createObjectURL(imageData.file);

  return {
    id: imageData.id,
    url,
    file: imageData.file,
    name: imageData.name,
    size: imageData.size,
    type: imageData.type,
  };
};

/**
 * Get all embedded images for a specific email
 * @param {any} db - IndexedDB database instance from idb library
 * @param {string} emailId - The email ID
 * @returns {Promise<Array>} - Array of embedded images for the email
 */
export const getEmbeddedImagesForEmail = async (db, emailId) => {
  if (!db) {
    throw new Error("Database not available");
  }

  const index = db.transaction("embeddedImages", "readonly").objectStore("embeddedImages").index("emailId");
  const images = await index.getAll(emailId);

  // Create new object URLs for each image
  return images.map((imageData) => ({
    ...imageData,
    url: URL.createObjectURL(imageData.file),
  }));
};

/**
 * Delete embedded images for a specific email
 * @param {any} db - IndexedDB database instance from idb library
 * @param {string} emailId - The email ID
 * @returns {Promise<void>}
 */
export const deleteEmbeddedImagesForEmail = async (db, emailId) => {
  if (!db) {
    throw new Error("Database not available");
  }

  const index = db.transaction("embeddedImages", "readwrite").objectStore("embeddedImages").index("emailId");
  const images = await index.getAll(emailId);

  // Revoke object URLs before deleting
  images.forEach((imageData) => {
    if (imageData.url) {
      URL.revokeObjectURL(imageData.url);
    }
  });

  // Delete all images for this email
  const deletePromises = images.map((imageData) => db.delete("embeddedImages", imageData.id));

  await Promise.all(deletePromises);
};

/**
 * Process HTML content to replace embedded image object URLs with IndexedDB references
 * @param {string} htmlContent - The HTML content to process
 * @param {Array} embeddedImages - Array of embedded image metadata
 * @returns {string} - Processed HTML content with IndexedDB references
 */
export const processHtmlForStorage = (htmlContent, embeddedImages) => {
  let processedHtml = htmlContent;

  // Only process if we have embedded images and the content contains object URLs
  if (!embeddedImages.length || !htmlContent.includes('src="blob:')) {
    return processedHtml;
  }

  embeddedImages.forEach((imageData) => {
    // Only replace if the URL is a blob URL (object URL)
    if (imageData.url.startsWith("blob:")) {
      const objectUrlPattern = new RegExp(`src="(${imageData.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})"`, "g");
      processedHtml = processedHtml.replace(
        objectUrlPattern,
        `src="data:image/placeholder;base64," data-embedded-image-id="${imageData.id}"`
      );
    }
  });

  return processedHtml;
};

/**
 * Process HTML content to restore embedded images from IndexedDB references
 * @param {string} htmlContent - The HTML content to process
 * @param {Array} embeddedImages - Array of embedded image metadata with new object URLs
 * @returns {string} - Processed HTML content with restored object URLs
 */
export const processHtmlForDisplay = (htmlContent, embeddedImages) => {
  let processedHtml = htmlContent;

  embeddedImages.forEach((imageData) => {
    // Replace data attributes with actual object URLs
    const placeholderPattern = new RegExp(`data-embedded-image-id="${imageData.id}"`, "g");
    processedHtml = processedHtml.replace(placeholderPattern, `src="${imageData.url}"`);
  });

  return processedHtml;
};

/**
 * Extract embedded image references from HTML content
 * @param {string} htmlContent - The HTML content to analyze
 * @returns {Array} - Array of image IDs found in the content
 */
export const extractEmbeddedImageIds = (htmlContent) => {
  const imageIdPattern = /data-embedded-image-id="([^"]+)"/g;
  const imageIds = [];
  let match;

  while ((match = imageIdPattern.exec(htmlContent)) !== null) {
    imageIds.push(match[1]);
  }

  return imageIds;
};
