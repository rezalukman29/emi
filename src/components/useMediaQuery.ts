import { useState, useEffect } from 'react';

// True while the viewport matches `query`. Used by the layouts to switch the sidebar
// between "always visible" (desktop) and "slide-over menu" (narrow screens).
export default function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

// Breakpoint at which the sidebar becomes a slide-over menu. Keep in sync with the
// `@media (max-width: 900px)` "RESPONSIVE" block at the end of style.css.
export const MOBILE_QUERY = '(max-width: 900px)';
