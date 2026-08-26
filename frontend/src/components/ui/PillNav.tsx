import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';

export interface PillNavItem {
  label: string;
  href: string;
  ariaLabel?: string;
}

export interface PillNavProps {
  logo?: string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
  embedded?: boolean;
  hideLogo?: boolean;
}

export const PillNav: React.FC<PillNavProps> = ({
  logo,
  logoAlt = 'Logo',
  items = [],
  activeHref,
  className = '',
  ease = 'power3.easeOut',
  baseColor = '#070A0E',
  pillColor = 'transparent',
  hoveredPillTextColor = '#34C795',
  pillTextColor = '#94A3B8',
  onMobileMenuClick,
  initialLoadAnimation = false,
  embedded = false,
  hideLogo = false
}) => {
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRefs = useRef<(gsap.core.Timeline | null)[]>([]);
  const activeTweenRefs = useRef<(gsap.core.Tween | null)[]>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle, index) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        if (w === 0 || h === 0) return;

        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`
        });

        const label = pill.querySelector('.pill-label');
        const white = pill.querySelector('.pill-label-hover');

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 0.35, ease, overwrite: 'auto' }, 0);

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 0.35, ease, overwrite: 'auto' }, 0);
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 0.35, ease, overwrite: 'auto' }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener('resize', onResize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 1, y: 0 });
    }

    if (initialLoadAnimation) {
      const logoEl = logoRef.current;
      const navItems = navItemsRef.current;

      if (logoEl) {
        gsap.set(logoEl, { scale: 0 });
        gsap.to(logoEl, {
          scale: 1,
          duration: 0.4,
          ease
        });
      }

      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: 'hidden' });
        gsap.to(navItems, {
          width: 'auto',
          duration: 0.4,
          ease
        });
      }
    }

    return () => {
      window.removeEventListener('resize', onResize);
      tlRefs.current.forEach(tl => tl?.kill());
    };
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.25,
      ease,
      overwrite: 'auto'
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: 'auto'
    });
  };

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.4,
      ease,
      overwrite: 'auto'
    });
  };

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll('.hamburger-line');
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.25, ease });
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.25, ease });
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.25, ease });
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.25, ease });
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.25,
            ease,
            transformOrigin: 'top center'
          }
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: 0.2,
          ease,
          transformOrigin: 'top center',
          onComplete: () => {
            gsap.set(menu, { visibility: 'hidden' });
          }
        });
      }
    }

    onMobileMenuClick?.();
  };

  const isExternalLink = (href: string) =>
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('#');

  const isRouterLink = (href: string) => href && !isExternalLink(href);

  const cssVars = {
    ['--base']: baseColor,
    ['--pill-bg']: pillColor,
    ['--hover-text']: hoveredPillTextColor,
    ['--pill-text']: resolvedPillTextColor,
    ['--nav-h']: '44px',
    ['--logo']: '34px',
    ['--pill-pad-x']: '14px',
    ['--pill-gap']: '6px'
  } as React.CSSProperties;

  const navContent = (
    <nav
      className={`w-full max-w-max flex items-center justify-between md:justify-start box-border p-1 rounded-full bg-white/[0.03] backdrop-blur-md transition-all ${className}`}
      aria-label="Primary"
      style={cssVars}
    >
      {!hideLogo && (
        logo ? (
          isRouterLink(items?.[0]?.href || '/') ? (
            <Link
              to={items?.[0]?.href || '/'}
              aria-label="Home"
              onMouseEnter={handleLogoEnter}
              role="menuitem"
              ref={el => {
                logoRef.current = el;
              }}
              className="rounded-full p-1.5 inline-flex items-center justify-center overflow-hidden shrink-0"
              style={{
                width: 'var(--nav-h)',
                height: 'var(--nav-h)',
                background: 'var(--base, #000)'
              }}
            >
              <img src={logo} alt={logoAlt} ref={logoImgRef} className="w-full h-full object-contain block" />
            </Link>
          ) : (
            <a
              href={items?.[0]?.href || '/'}
              aria-label="Home"
              onMouseEnter={handleLogoEnter}
              ref={el => {
                logoRef.current = el;
              }}
              className="rounded-full p-1.5 inline-flex items-center justify-center overflow-hidden shrink-0"
              style={{
                width: 'var(--nav-h)',
                height: 'var(--nav-h)',
                background: 'var(--base, #000)'
              }}
            >
              <img src={logo} alt={logoAlt} ref={logoImgRef} className="w-full h-full object-contain block" />
            </a>
          )
        ) : (
          <Link
            to="/"
            aria-label="Home"
            onMouseEnter={handleLogoEnter}
            ref={el => {
              logoRef.current = el;
            }}
            className="rounded-full px-2.5 h-[var(--nav-h)] inline-flex items-center justify-center font-display font-bold text-xs tracking-tight text-white gap-1.5 hover:text-emerald-400 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>GLOBEX</span>
          </Link>
        )
      )}

      <div
        ref={navItemsRef}
        className="relative items-center rounded-full hidden md:flex"
        style={{
          height: 'var(--nav-h)',
          background: 'transparent'
        }}
      >
        <ul
          role="menubar"
          className="list-none flex items-stretch m-0 p-0 h-full"
          style={{ gap: 'var(--pill-gap)' }}
        >
          {items.map((item, i) => {
            const isActive =
              activeHref === item.href ||
              (item.href !== "/" && item.href !== "/home" && activeHref?.startsWith(item.href));

            const pillStyle = {
              background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--pill-text, #94A3B8)',
              paddingLeft: 'var(--pill-pad-x)',
              paddingRight: 'var(--pill-pad-x)'
            };

            const PillContent = (
              <>
                <span
                  className="hover-circle absolute left-1/2 bottom-0 rounded-full z-[1] block pointer-events-none opacity-40"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    willChange: 'transform'
                  }}
                  aria-hidden="true"
                  ref={el => {
                    circleRefs.current[i] = el;
                  }}
                />
                <span className="label-stack relative inline-block leading-[1] z-[2]">
                  <span
                    className="pill-label relative z-[2] inline-block leading-[1]"
                    style={{ willChange: 'transform' }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="pill-label-hover absolute left-0 top-0 z-[3] inline-block"
                    style={{
                      color: 'var(--hover-text, #34C795)',
                      willChange: 'transform, opacity'
                    }}
                    aria-hidden="true"
                  >
                    {item.label}
                  </span>
                </span>
                {isActive && (
                  <span
                    className="absolute left-1/2 bottom-[2px] -translate-x-1/2 w-1 h-1 rounded-full z-[4] bg-emerald-400 shadow-[0_0_8px_#34C795]"
                    aria-hidden="true"
                  />
                )}
              </>
            );

            const basePillClasses =
              'relative overflow-hidden inline-flex items-center justify-center h-full no-underline rounded-full box-border font-medium text-sm tracking-normal whitespace-nowrap cursor-pointer px-0 transition-all duration-200 hover:text-white';

            return (
              <li key={item.href} role="none" className="flex h-full">
                {isRouterLink(item.href) ? (
                  <Link
                    role="menuitem"
                    to={item.href}
                    className={basePillClasses}
                    style={pillStyle}
                    aria-label={item.ariaLabel || item.label}
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
                  >
                    {PillContent}
                  </Link>
                ) : (
                  <a
                    role="menuitem"
                    href={item.href}
                    className={basePillClasses}
                    style={pillStyle}
                    aria-label={item.ariaLabel || item.label}
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
                  >
                    {PillContent}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <button
        ref={hamburgerRef}
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
        aria-expanded={isMobileMenuOpen}
        className="md:hidden rounded-full flex flex-col items-center justify-center gap-1 cursor-pointer p-0 relative ml-1 bg-transparent hover:bg-white/[0.05]"
        style={{
          width: 'var(--nav-h)',
          height: 'var(--nav-h)'
        }}
      >
        <span
          className="hamburger-line w-3.5 h-0.5 rounded origin-center transition-all duration-[10ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] bg-slate-300"
        />
        <span
          className="hamburger-line w-3.5 h-0.5 rounded origin-center transition-all duration-[10ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] bg-slate-300"
        />
      </button>
    </nav>
  );

  if (embedded) {
    return navContent;
  }

  return (
    <div className="absolute top-4 z-[1000] w-full flex justify-center px-4 pointer-events-auto">
      {navContent}

      <div
        ref={mobileMenuRef}
        className="md:hidden absolute top-14 left-4 right-4 rounded-2xl bg-[#0B1019]/95 backdrop-blur-2xl shadow-2xl z-[998] origin-top p-2"
        style={cssVars}
      >
        <ul className="list-none m-0 p-1 flex flex-col gap-1.5">
          {items.map(item => {
            const linkClasses =
              'block py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-150 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300';

            return (
              <li key={item.href}>
                {isRouterLink(item.href) ? (
                  <Link
                    to={item.href}
                    className={linkClasses}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    className={linkClasses}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default PillNav;
