import DOMPurify from 'dompurify';

/**
 * Frontend XSS prevention utilities using DOMPurify
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed - strip all
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true // Keep text content but strip tags
  });
}

/**
 * Sanitize plain text (removes HTML tags and encodes special characters)
 * @param text - The text to sanitize
 * @returns Sanitized plain text
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // First strip HTML tags
  const withoutTags = sanitizeHtml(text);
  
  // Then escape special characters for safe display
  return withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * React component wrapper to safely render user-generated content
 * Note: This is a utility function, not a React component.
 * Use it directly: {sanitizeText(content)}
 */

