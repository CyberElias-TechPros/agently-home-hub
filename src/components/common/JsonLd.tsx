import { useEffect } from 'react';

type JsonObject = Record<string, unknown>;

/**
 * Renders one or more JSON-LD blocks.
 *
 * The script is injected imperatively (rather than via dangerouslySetInnerHTML
 * in JSX) so that it is removed on unmount — otherwise stale structured data
 * from a previous route would linger in the head and contradict the visible
 * page, which is exactly the sort of mismatch search engines penalise.
 */
export function JsonLd({ data }: { data: JsonObject | JsonObject[] }) {
  useEffect(() => {
    const blocks = Array.isArray(data) ? data : [data];
    const scripts = blocks.map((block) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-agently-jsonld', 'true');
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      scripts.forEach((script) => script.remove());
    };
  }, [data]);

  return null;
}
