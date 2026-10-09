import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useMediaQuery, { MOBILE_QUERY } from './useMediaQuery';

// Sidebar visibility for the tenant and Owner-panel layouts.
//   Wide screens:   open by default; the header button hides/shows it.
//   Narrow screens: a slide-over menu, closed by default; it closes by itself after any
//                   navigation and when the backdrop is tapped.
// Derived instead of synced with effects: the slide-over counts as open only while
// `openKey` equals the current router location key, so changing page closes it for free.
export default function useSidebar() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const location = useLocation();
  const [desktopHidden, setDesktopHidden] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const mobileOpen = openKey === location.key;
  // Escape also dismisses the mobile menu.
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenKey(null); };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, []);
  const visible = isMobile ? mobileOpen : !desktopHidden;

  function toggle() {
    if (isMobile) setOpenKey(k => (k === location.key ? null : location.key));
    else setDesktopHidden(h => !h);
  }
  function close() { setOpenKey(null); }

  return { isMobile, visible, toggle, close };
}
