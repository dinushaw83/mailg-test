import { generateRandomId } from "./helperFunctions";

/**
 * Store an embedded image file in IndexedDB
 * @param {any} db - IndexedDB database instance from idb library
 * @param {File} file - The image file to store
 * @param {string} emailId - The email ID this image belongs to
 * @returns {Promise<{id: string}>} - The stored image metadata
 */
export const storeEmbeddedImage = async (db, file, emailId) => {
  if (!db) {
    throw new Error("Database not available");
  }

  const id = generateRandomId();

  const imageData = {
    id,
    emailId,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    timestamp: new Date().toISOString(),
  };

  await db.put("embeddedImages", imageData);

  return { id };
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
 * Process HTML content to replace object URLs with IndexedDB references
 * @param {string} htmlContent - The HTML content to process
 * @param {Array} imageMap - Map of object URLs to image IDs
 * @returns {string} - Processed HTML content with IndexedDB references
 */
export const processHtmlForStorage = (htmlContent, imageMap) => {
  console.log("debug: processHtmlForStorage called with htmlContent:", htmlContent);
  console.log("debug: processHtmlForStorage imageMap:", imageMap);

  let processedHtml = htmlContent;

  // Replace each object URL with its corresponding image ID
  Object.entries(imageMap).forEach(([objectUrl, imageId]) => {
    console.log("debug: Processing object URL:", objectUrl, "-> image ID:", imageId);
    const objectUrlPattern = new RegExp(`src="(${objectUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})"`, "g");
    const beforeReplace = processedHtml;
    processedHtml = processedHtml.replace(
      objectUrlPattern,
      `src="data:image/placeholder;base64," data-embedded-image-id="${imageId}"`
    );
    console.log("debug: Replacement result:", beforeReplace !== processedHtml ? "replaced" : "no match");
  });

  console.log("debug: processHtmlForStorage result:", processedHtml);
  return processedHtml;
};

/**
 * Process HTML content to restore embedded images from IndexedDB references
 * @param {string} htmlContent - The HTML content to process
 * @param {Array} embeddedImages - Array of embedded image metadata with new object URLs
 * @returns {string} - Processed HTML content with restored object URLs
 */
export const processHtmlForDisplay = (htmlContent, embeddedImages) => {
  console.log("debug: processHtmlForDisplay called with htmlContent:", htmlContent);
  console.log("debug: processHtmlForDisplay embeddedImages:", embeddedImages);

  let processedHtml = htmlContent;

  embeddedImages.forEach((imageData) => {
    console.log("debug: Processing image for display:", imageData.id, "-> URL:", imageData.url);
    // Find img tags with the specific data-embedded-image-id and replace the entire src attribute
    const imgPattern = new RegExp(
      `(<img[^>]*?)src="[^"]*"[^>]*?data-embedded-image-id="${imageData.id}"([^>]*?>)`,
      "g"
    );
    const beforeReplace = processedHtml;
    processedHtml = processedHtml.replace(imgPattern, `$1src="${imageData.url}"$2`);
    console.log("debug: Display replacement result:", beforeReplace !== processedHtml ? "replaced" : "no match");
  });

  console.log("debug: processHtmlForDisplay result:", processedHtml);
  return processedHtml;
};

/**
 * Extract embedded image references from HTML content
 * @param {string} htmlContent - The HTML content to analyze
 * @returns {Array} - Array of image IDs found in the content
 */
export const extractEmbeddedImageIds = (htmlContent) => {
  console.log("debug: extractEmbeddedImageIds called with htmlContent:", htmlContent);

  const imageIdPattern = /data-embedded-image-id="([^"]+)"/g;
  const imageIds = [];
  let match;

  while ((match = imageIdPattern.exec(htmlContent)) !== null) {
    imageIds.push(match[1]);
  }

  console.log("debug: extractEmbeddedImageIds found image IDs:", imageIds);
  return imageIds;
};

/**
 * Update the emailId for embedded images
 * @param {any} db - IndexedDB database instance from idb library
 * @param {Array} imageIds - Array of image IDs to update
 * @param {string} emailId - The new email ID
 * @returns {Promise<void>}
 */
export const updateEmbeddedImagesEmailId = async (db, imageIds, emailId) => {
  if (!db) {
    throw new Error("Database not available");
  }

  const updatePromises = imageIds.map(async (imageId) => {
    try {
      const imageData = await db.get("embeddedImages", imageId);
      if (imageData) {
        imageData.emailId = emailId;
        await db.put("embeddedImages", imageData);
      }
    } catch (error) {
      console.warn(`Failed to update emailId for image ${imageId}:`, error);
    }
  });

  await Promise.all(updatePromises);
};
