import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Restores scroll to the top on navigation.
 *
 * React Router keeps the scroll position between routes, which means arriving on
 * a new page halfway down the document. Hash links are left alone so in-page
 * anchors still work.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname, hash]);

  return null;
}
