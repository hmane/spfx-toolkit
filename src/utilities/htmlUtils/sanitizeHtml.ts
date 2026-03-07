const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'sub',
  'sup',
  'u',
  'ul',
]);

const GLOBAL_ATTRIBUTES = new Set(['aria-label', 'class', 'title']);
const LINK_ATTRIBUTES = new Set(['href', 'target', 'rel']);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:') ||
    normalized.startsWith('/') ||
    normalized.startsWith('#')
  );
}

function sanitizeNode(node: Node, doc: Document): Node {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return doc.createDocumentFragment();
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = doc.createDocumentFragment();
    Array.from(element.childNodes).forEach(child => {
      fragment.appendChild(sanitizeNode(child, doc));
    });
    return fragment;
  }

  const clean = doc.createElement(tagName);

  Array.from(element.attributes).forEach(attribute => {
    const attributeName = attribute.name.toLowerCase();
    const attributeValue = attribute.value;

    if (attributeName.startsWith('on') || attributeName === 'style') {
      return;
    }

    if (GLOBAL_ATTRIBUTES.has(attributeName)) {
      clean.setAttribute(attributeName, attributeValue);
      return;
    }

    if (tagName === 'a' && LINK_ATTRIBUTES.has(attributeName)) {
      if (attributeName === 'href') {
        if (isSafeUrl(attributeValue)) {
          clean.setAttribute('href', attributeValue);
        }
        return;
      }

      if (attributeName === 'target') {
        if (attributeValue === '_blank' || attributeValue === '_self') {
          clean.setAttribute('target', attributeValue);
        }
        return;
      }

      if (attributeName === 'rel') {
        clean.setAttribute('rel', attributeValue);
      }
    }
  });

  if (tagName === 'a' && clean.getAttribute('target') === '_blank' && !clean.getAttribute('rel')) {
    clean.setAttribute('rel', 'noopener noreferrer');
  }

  Array.from(element.childNodes).forEach(child => {
    clean.appendChild(sanitizeNode(child, doc));
  });

  return clean;
}

export function sanitizeHtml(html: string): string {
  if (!html) {
    return '';
  }

  if (typeof document === 'undefined') {
    return escapeHtml(html);
  }

  const template = document.createElement('template');
  template.innerHTML = html;

  const container = document.createElement('div');
  Array.from(template.content.childNodes).forEach(node => {
    container.appendChild(sanitizeNode(node, document));
  });

  return container.innerHTML;
}
