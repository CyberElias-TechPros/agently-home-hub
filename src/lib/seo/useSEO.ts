import { useEffect } from 'react';

/**
 * Document head management for a client-rendered SPA.
 *
 * React Router does not touch the head, so without this every route would share
 * the home page's title and description — which is both a bad user experience
 * and a serious SEO problem.
 *
 * This hook owns exactly one concern: keep `<title>`, meta description,
 * canonical URL and social tags in sync with the active route. Structured data
 * is handled separately by `<JsonLd />` because it needs to be rendered, not
 * just set.
 */

export const SITE_NAME = 'Agently';
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://agently.app').replace(/\/+$/, '');

export interface SeoOptions {
  title: string;
  description: string;
  /** Appended to the site name unless `absoluteTitle` is set. */
  absoluteTitle?: boolean;
  canonicalPath?: string;
  /** Relative or absolute image URL. */
  image?: string;
  type?: 'website' | 'article';
  /** Pages that must never be indexed (authenticated areas). */
  noindex?: boolean;
  robots?: string;
}

function upsertMeta(selector: string, attributes: Record<string, string>): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
}

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function absoluteUrl(path = '/'): string {
  return path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function useSEO({
  title,
  description,
  absoluteTitle = false,
  canonicalPath,
  image = '/og-image.jpg',
  type = 'website',
  noindex = false,
  robots,
}: SeoOptions): void {
  useEffect(() => {
    const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: absoluteUrl(image) });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absoluteUrl(image) });

    const robotsValue = robots ?? (noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robotsValue });

    const canonical = canonicalPath ?? `${window.location.pathname}${window.location.search}`;
    upsertLink('canonical', absoluteUrl(canonical));
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: absoluteUrl(canonical) });
  }, [title, description, absoluteTitle, canonicalPath, image, type, noindex, robots]);
}
