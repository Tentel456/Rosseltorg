"use client";

import gsap from "gsap";
import { LiquidMetal } from "@paper-design/shaders-react";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const isVisible = (element?: HTMLElement | null): boolean => {
  if (!element || element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  return element.getClientRects().length > 0;
};

const getFocusableElements = (container?: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];
  return (Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]).filter(isVisible);
};

interface UseFocusTrapParams {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}

function useFocusTrap({ active, containerRef, initialFocusRef, onEscape }: UseFocusTrapParams) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitial = () => {
      const target = initialFocusRef?.current ?? getFocusableElements(container)[0] ?? container;
      if (!(target instanceof HTMLElement)) return;
      if (target === container && !container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }
      target.focus();
    };

    const focusFrame = requestAnimationFrame(focusInitial);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === first || !container.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (activeElement === last || !container.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}

const CLIPS = {
  bottom: {
    closedInitial: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
  },
  top: {
    closedInitial: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
  },
  left: {
    closedInitial: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
  },
  right: {
    closedInitial: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
    open: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    closedFinal: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
  },
};

const REDUCED_MOTION_FADE_DURATION = 0.2;

export interface FullscreenNavLink {
  label: string;
  href: string;
}

export interface FullscreenNavProps {
  links?: FullscreenNavLink[];
  /** Brand text shown in the fixed header, linking to `brandHref`. */
  brand?: string;
  brandHref?: string;
  clipOrigin?: keyof typeof CLIPS;
  overlayBg?: string;
  linkColor?: string;
  linkHoverColor?: string;
  linkSizeClass?: string;
  headerClassName?: string;
  openDuration?: number;
  closeDuration?: number;
  ease?: string;
  /** Header text/hamburger-bar color while the overlay is open. Closed color is fixed black, matching the header's light-page default. */
  headerOpenColor?: string;
  onOpen?: () => void;
  onClose?: () => void;
  children?: (isOpen: boolean) => ReactNode;
}

function FullscreenNav({
  links,
  brand = "Roseltorg",
  brandHref = "/",
  clipOrigin = "bottom",
  overlayBg = "#000000",
  linkColor = "#ffffff",
  linkHoverColor = "#a3a3a3",
  linkSizeClass = "text-5xl",
  headerClassName = "",
  openDuration = 1.2,
  closeDuration = 1.2,
  ease = "power4.inOut",
  headerOpenColor = "#ffffff",
  onOpen,
  onClose,
  children,
}: FullscreenNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const overlayRef = useRef<HTMLElement | null>(null);
  const linksWrapperRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);
  const isAnimatingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const reduceMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const { closedInitial, open: openClipPath, closedFinal } = CLIPS[clipOrigin] ?? CLIPS.bottom;
  const isReducedMotion = reduceMotion();

  const onOpenMenu = () => {
    setIsOpen(true);
    timelineRef.current?.kill();

    gsap.set(overlayRef.current, { clipPath: closedInitial });
    gsap.set(linksWrapperRef.current, { opacity: 1, scale: 1 });

    if (isReducedMotion) {
      gsap.set(overlayRef.current, { clipPath: openClipPath, autoAlpha: 0 });

      timelineRef.current = gsap.to(overlayRef.current, {
        autoAlpha: 1,
        duration: REDUCED_MOTION_FADE_DURATION,
        ease: "power2.out",
        onStart: () => {
          isAnimatingRef.current = true;
        },
        onComplete: () => {
          isAnimatingRef.current = false;
          onOpen?.();
        },
      });
      return;
    }

    const timeline = gsap.timeline({
      onStart: () => {
        isAnimatingRef.current = true;
      },
      onComplete: () => {
        isAnimatingRef.current = false;
        onOpen?.();
      },
    });

    timelineRef.current = timeline;

    timeline.to(overlayRef.current, {
      clipPath: openClipPath,
      duration: openDuration,
      delay: 0.2,
      ease,
    });
  };

  const onCloseMenu = () => {
    setIsOpen(false);
    timelineRef.current?.kill();

    if (isReducedMotion) {
      gsap.set(linksWrapperRef.current, { scale: 1, opacity: 1 });

      timelineRef.current = gsap.to(overlayRef.current, {
        autoAlpha: 0,
        duration: REDUCED_MOTION_FADE_DURATION,
        ease: "power2.out",
        onStart: () => {
          isAnimatingRef.current = true;
        },
        onComplete: () => {
          isAnimatingRef.current = false;
          gsap.set(overlayRef.current, { clipPath: closedFinal });
          onClose?.();
        },
      });

      gsap.set(overlayRef.current, { clipPath: closedFinal });
      return;
    }

    const timeline = gsap.timeline({
      onStart: () => {
        isAnimatingRef.current = true;
      },
      onComplete: () => {
        isAnimatingRef.current = false;
        onClose?.();
      },
    });

    timelineRef.current = timeline;

    timeline
      .to(linksWrapperRef.current, { scale: 0.9, opacity: 0.5, duration: 0.7, ease: "power2.in" })
      .to(overlayRef.current, { clipPath: closedFinal, duration: closeDuration, ease }, "<");
  };

  const onToggleMenu = () => {
    if (isAnimatingRef.current) return;
    if (isOpen) {
      onCloseMenu();
      return;
    }
    onOpenMenu();
  };

  const onLinkMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.color = linkHoverColor;
  };

  const onLinkMouseLeave = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.color = linkColor;
  };

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Trap focus inside the overlay while open, restore it to the toggle on close.
  useFocusTrap({ active: isOpen, containerRef: rootRef, initialFocusRef: toggleButtonRef, onEscape: onCloseMenu });

  return (
    <div ref={rootRef}>
      <header className={`fixed top-0 left-0 right-0 z-70 flex h-20 items-center justify-between px-8 ${headerClassName}`}>
        <a
          href={brandHref}
          className="cursor-pointer text-lg font-semibold uppercase tracking-[0.15em] transition-colors duration-300 delay-700 motion-reduce:transition-none"
          style={{ color: isOpen ? headerOpenColor : "#ffffff" }}
        >
          {brand}
        </a>

        <button
          ref={toggleButtonRef}
          onClick={onToggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          className="flex size-10 cursor-pointer flex-col items-center justify-center gap-1.5 max-[1025px]:size-14 max-md:size-10"
        >
          <span
            style={{ backgroundColor: isOpen ? headerOpenColor : undefined }}
            className={`block h-0.5 w-full transition-all duration-700 ease-in-out delay-300 motion-reduce:transition-none ${
              isOpen ? "translate-y-1.75 rotate-45" : isReducedMotion ? "translate-y-0 rotate-0 bg-white" : "bg-white"
            }`}
          />
          <span
            style={{ backgroundColor: isOpen ? headerOpenColor : undefined }}
            className={`block h-0.5 w-full transition-all duration-500 delay-300 motion-reduce:transition-none ${
              isOpen ? "scale-x-0 opacity-0" : isReducedMotion ? "scale-x-100 opacity-100 bg-white" : "bg-white"
            }`}
          />
          <span
            style={{ backgroundColor: isOpen ? headerOpenColor : undefined }}
            className={`block h-0.5 w-full transition-all duration-700 ease-in-out delay-300 motion-reduce:transition-none ${
              isOpen ? "-translate-y-2.25 -rotate-45" : isReducedMotion ? "translate-y-0 rotate-0 bg-white" : "bg-white"
            }`}
          />
        </button>
      </header>

      <nav
        ref={overlayRef}
        style={{ clipPath: closedInitial, backgroundColor: overlayBg }}
        className={`fixed inset-0 z-60 flex flex-col items-center justify-center gap-2 overflow-y-auto ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isOpen}
        role="navigation"
      >
        {/* min-h-screen, not h-screen: content shorter than the viewport still
            fills it, but content taller than it (e.g. a lot of links at a
            small window height) can grow past 100vh instead of being
            clamped and clipped — the overflow-y-auto above then scrolls it. */}
        <div ref={linksWrapperRef} className="flex min-h-screen w-screen flex-col items-center justify-center motion-reduce:opacity-100">
          {children
            ? children(isOpen)
            : (links as FullscreenNavLink[]).map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={isOpen ? onCloseMenu : undefined}
                  tabIndex={isOpen ? 0 : -1}
                  style={{ color: linkColor }}
                  onMouseEnter={onLinkMouseEnter}
                  onMouseLeave={onLinkMouseLeave}
                  className={`${linkSizeClass} font-normal tracking-tight transition-colors motion-reduce:transition-none`}
                >
                  {label}
                </a>
              ))}
        </div>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * CustomNavbar — a fuller panel layout (links, image row, brand/tagline,
 * socials, location) meant to be passed as FullscreenNav's children render
 * prop. Handles its own reveal animation keyed off `isOpen`.
 * ------------------------------------------------------------------ */


const DEFAULT_LINK_Y_OFFSET = 30;
const DEFAULT_LINK_DURATION = 0.8;
const DEFAULT_LINK_STAGGER = 0.07;
const DEFAULT_LINK_CHAR_STAGGER = 0.015;
const IMAGE_INITIAL_SCALE = 0.7;
const DEFAULT_IMAGE_START_SCALE = 0.8;
const DEFAULT_IMAGE_DURATION = 0.9;
const DEFAULT_IMAGE_STAGGER = 0.02;
const DEFAULT_SOCIAL_Y_OFFSET = 14;
const DEFAULT_SOCIAL_DURATION = 0.5;
const DEFAULT_SOCIAL_STAGGER = 0.06;
const HEADER_Y_OFFSET = -12;
const LOCATION_Y_OFFSET = 10;
const DELAY_OFFSET = 0.2;
const TAGLINE_DELAY_OFFSET = 0.08;
const IMAGE_DELAY_OFFSET = 0.1;
const SOCIAL_DELAY_OFFSET = 0.2;
const LOCATION_DELAY_OFFSET = 0.25;

/* Character-split hover reveal for the main nav links — borrowed from
   unfold-navbar's LinkHover: each character sits above its own text-shadow
   duplicate (offset 1.2em down, same color), and on hover/focus every
   character's real copy slides up out of view at a staggered delay,
   revealing the shadow copy sliding into place beneath it. Falls back to
   plain text under prefers-reduced-motion. */
function NavLinkHover({
  label,
  href,
  charStagger,
  reduced,
  onClick,
}: {
  label: string;
  href: string;
  charStagger: number;
  reduced: boolean;
  onClick?: () => void;
}) {
  if (reduced) {
    return (
      <a href={href} onClick={onClick}>
        {label}
      </a>
    );
  }

  return (
    <a href={href} onClick={onClick} className="group/link-hover inline-block no-underline">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="relative inline-block overflow-hidden align-middle leading-[1.08]">
        {[...label].map((char, index) => (
          <span
            key={index}
            className="relative inline-block whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/link-hover:-translate-y-[1.2em] group-focus-visible/link-hover:-translate-y-[1.2em]"
            style={{ textShadow: "0 1.2em currentColor", transitionDelay: `${index * charStagger}s` }}
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
    </a>
  );
}

export interface CustomNavbarLink {
  label: string;
  href: string;
}

export interface CustomNavbarSocial {
  type: string;
  href: string;
}

export interface CustomNavbarProps {
  links?: CustomNavbarLink[];
  agencyName?: string;
  socials?: CustomNavbarSocial[];
  location?: string;
  tagline?: string;
  isOpen?: boolean;
  overlayBg?: string;
  delay?: number;
  linkOffsetY?: number;
  linkDuration?: number;
  linkStagger?: number;
  /** Per-character delay (seconds) on the main links' hover reveal. */
  linkCharStagger?: number;
  imageStartScale?: number;
  imageDuration?: number;
  imageStagger?: number;
  socialOffsetY?: number;
  socialDuration?: number;
  socialStagger?: number;
}

function CustomNavbar({
  links = [],
  agencyName = "Roseltorg",
  socials = [
    { type: "instagram", href: "#" },
    { type: "facebook", href: "#" },
    { type: "twitter", href: "#" },
    { type: "linkedin", href: "#" },
  ],
  location = "Pune, India",
  tagline = "Design. Code. Impact.",
  isOpen = false,
  overlayBg = "#000000",
  delay = 1,
  linkOffsetY = DEFAULT_LINK_Y_OFFSET,
  linkDuration = DEFAULT_LINK_DURATION,
  linkStagger = DEFAULT_LINK_STAGGER,
  linkCharStagger = DEFAULT_LINK_CHAR_STAGGER,
  imageStartScale = DEFAULT_IMAGE_START_SCALE,
  imageDuration = DEFAULT_IMAGE_DURATION,
  imageStagger = DEFAULT_IMAGE_STAGGER,
  socialOffsetY = DEFAULT_SOCIAL_Y_OFFSET,
  socialDuration = DEFAULT_SOCIAL_DURATION,
  socialStagger = DEFAULT_SOCIAL_STAGGER,
}: CustomNavbarProps) {
  const linksRef = useRef<(HTMLDivElement | null)[]>([]);
  const imagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const socialsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const agencyRef = useRef<HTMLHeadingElement | null>(null);
  const taglineRef = useRef<HTMLParagraphElement | null>(null);
  const locationRef = useRef<HTMLSpanElement | null>(null);
  const reduceMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  const isReducedMotion = reduceMotion();

  const killAllTweens = () => {
    gsap.killTweensOf([...linksRef.current, ...imagesRef.current, ...socialsRef.current, agencyRef.current, taglineRef.current, locationRef.current]);
  };

  const resetAnimatedElements = () => {
    gsap.set(linksRef.current, { y: linkOffsetY, opacity: 0 });
    gsap.set(imagesRef.current, { scale: IMAGE_INITIAL_SCALE, opacity: 0 });
    gsap.set(socialsRef.current, { y: socialOffsetY, opacity: 0 });
    gsap.set(agencyRef.current, { y: HEADER_Y_OFFSET, opacity: 0 });
    gsap.set(taglineRef.current, { y: HEADER_Y_OFFSET, opacity: 0 });
    gsap.set(locationRef.current, { y: LOCATION_Y_OFFSET, opacity: 0 });
  };

  const setLinkRef = (index: number) => (element: HTMLDivElement | null) => {
    linksRef.current[index] = element;
  };

  const setImageRef = (index: number) => (element: HTMLDivElement | null) => {
    imagesRef.current[index] = element;
  };

  const setSocialRef = (index: number) => (element: HTMLAnchorElement | null) => {
    socialsRef.current[index] = element;
  };

  useEffect(() => {
    killAllTweens();

    if (!isOpen) return;

    resetAnimatedElements();

    if (reduceMotion()) {
      gsap.set(agencyRef.current, { y: 0, opacity: 1 });
      gsap.set(taglineRef.current, { y: 0, opacity: 1 });
      gsap.set(linksRef.current, { y: 0, opacity: 1 });
      gsap.set(imagesRef.current, { scale: 1, opacity: 1 });
      gsap.set(socialsRef.current, { y: 0, opacity: 1 });
      gsap.set(locationRef.current, { y: 0, opacity: 1 });
      return;
    }

    const animationDelay = Math.max(delay - DELAY_OFFSET, 0);

    gsap.fromTo(agencyRef.current, { y: HEADER_Y_OFFSET, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: animationDelay });

    gsap.fromTo(
      taglineRef.current,
      { y: HEADER_Y_OFFSET, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: animationDelay + TAGLINE_DELAY_OFFSET },
    );

    gsap.fromTo(
      linksRef.current,
      { y: linkOffsetY, opacity: 0 },
      { y: 0, opacity: 1, duration: linkDuration, ease: "power2.out", stagger: linkStagger, delay: animationDelay },
    );

    gsap.fromTo(
      imagesRef.current,
      { scale: imageStartScale, opacity: 0 },
      { scale: 1, opacity: 1, duration: imageDuration, ease: "power3.out", stagger: imageStagger, delay: animationDelay + IMAGE_DELAY_OFFSET },
    );

    gsap.fromTo(
      socialsRef.current,
      { y: socialOffsetY, opacity: 0 },
      { y: 0, opacity: 1, duration: socialDuration, ease: "power2.out", stagger: socialStagger, delay: animationDelay + SOCIAL_DELAY_OFFSET },
    );

    gsap.fromTo(
      locationRef.current,
      { y: LOCATION_Y_OFFSET, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", delay: animationDelay + LOCATION_DELAY_OFFSET },
    );
  }, [delay, imageDuration, imageStagger, imageStartScale, isOpen, linkDuration, linkOffsetY, linkStagger, socialDuration, socialOffsetY, socialStagger]);

  return (
    <div style={{ backgroundColor: overlayBg }} className="flex min-h-screen w-full flex-col justify-between gap-10 px-28 py-10 pt-28 text-white max-[1025px]:px-6 max-[1025px]:py-20">
      {(agencyName || tagline) && (
        <div className="flex flex-col gap-1">
          {agencyName && (
            <h2 ref={agencyRef} className="text-sans font-medium uppercase tracking-[0.1em] opacity-90">
              {agencyName}
            </h2>
          )}
          {tagline && (
            <p ref={taglineRef} className="text-sm opacity-60">
              {tagline}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-10 max-[1025px]:flex-col max-[1025px]:items-start max-[1025px]:gap-18">
        <div className="flex flex-col gap-0">
          {links.map((link, index) => (
            <div key={link.label} ref={setLinkRef(index)} className="z-60 text-[6vw] max-[1025px]:text-[7vw]" style={{ opacity: 0, transform: `translateY(${linkOffsetY}px)` }}>
              <NavLinkHover label={link.label} href={link.href} charStagger={linkCharStagger} reduced={isReducedMotion} />
            </div>
          ))}
        </div>

        <div className="flex h-full flex-col items-end justify-center gap-40 py-5 max-[1025px]:w-full max-[1025px]:items-start max-[1025px]:gap-25 max-[1025px]:py-0">
  <div
  ref={setImageRef(0)}
  style={{
    opacity: 0,
    transform: `scale(${IMAGE_INITIAL_SCALE})`,
  }}
  className="relative flex h-[30vw] w-[50vw] max-w-[1280px] items-center justify-center overflow-hidden rounded-xl max-[1025px]:h-[50vw] max-[1025px]:w-full max-[1025px]:max-w-[700px] max-[1025px]:rounded-md"
>
  <LiquidMetal
    width={1280}
    height={1280}
    image="/Navbar/Roseltorg.svg"
    colorBack="#00000000"
    colorTint="#ffffff"
    shape={undefined}
    repetition={2}
    softness={0.1}
    shiftRed={0.3}
    shiftBlue={0.3}
    distortion={0.07}
    contour={0.4}
    angle={70}
    speed={1}
    scale={0.6}
    fit="contain"
  />
</div>
</div>
      </div>

      <div className="flex items-end justify-between max-[1025px]:pb-10">
        <div className="flex items-end gap-6">
        </div>
        {location && (
          <span ref={locationRef} className="text-sm opacity-60">
            {location}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const NAV_CONFIG: Partial<FullscreenNavProps> = {
  brand: "Hyperiux",
  brandHref: "/",
  clipOrigin: "bottom",
  overlayBg: "#ff5f00",
  headerOpenColor: "#ffffff",
  openDuration: 1.2,
  closeDuration: 1.2,
};

const NAV_CONTENT: Partial<CustomNavbarProps> = {
  agencyName: "Roseltorg",
  tagline: "Сервис для поиска производителей.",
  location: "Россия",
  links: [
    { label: "Главная", href: "#" },
    { label: "Вход", href: "#" },
    { label: "Блог", href: "#" },
    { label: "Контакты", href: "#" },
  ],
};

export interface ImmersiveFullscreenNavProps {
  navConfig?: Partial<FullscreenNavProps>;
  navContent?: Partial<CustomNavbarProps>;
  overlayBg?: string;
  headerOpenColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  ease?: string;
  clipOrigin?: "top" | "bottom" | "left" | "right";
  openDuration?: number;
  closeDuration?: number;
  linkDuration?: number;
  linkStagger?: number;
  linkCharStagger?: number;
  linkOffsetY?: number;
  imageDuration?: number;
  imageStagger?: number;
  imageStartScale?: number;
  socialDuration?: number;
  socialStagger?: number;
  socialOffsetY?: number;
}


export default function ImmersiveFullscreenNav({ navConfig = NAV_CONFIG, navContent = NAV_CONTENT, ...props }: ImmersiveFullscreenNavProps) {
  const {
    overlayBg,
    headerOpenColor,
    linkColor,
    linkHoverColor,
    ease,
    clipOrigin,
    openDuration,
    closeDuration,
    linkDuration,
    linkStagger,
    linkCharStagger,
    linkOffsetY,
    imageDuration,
    imageStagger,
    imageStartScale,
    socialDuration,
    socialStagger,
    socialOffsetY,
  } = props;

  const config = {
    ...NAV_CONFIG,
    ...navConfig,
    ...(overlayBg !== undefined ? { overlayBg } : {}),
    ...(headerOpenColor !== undefined ? { headerOpenColor } : {}),
    ...(linkColor !== undefined ? { linkColor } : {}),
    ...(linkHoverColor !== undefined ? { linkHoverColor } : {}),
    ...(ease !== undefined ? { ease } : {}),
    ...(clipOrigin !== undefined ? { clipOrigin } : {}),
    ...(openDuration !== undefined ? { openDuration } : {}),
    ...(closeDuration !== undefined ? { closeDuration } : {}),
  };

  const content = {
    ...NAV_CONTENT,
    ...navContent,
    ...(linkDuration !== undefined ? { linkDuration } : {}),
    ...(linkStagger !== undefined ? { linkStagger } : {}),
    ...(linkCharStagger !== undefined ? { linkCharStagger } : {}),
    ...(linkOffsetY !== undefined ? { linkOffsetY } : {}),
    ...(imageDuration !== undefined ? { imageDuration } : {}),
    ...(imageStagger !== undefined ? { imageStagger } : {}),
    ...(imageStartScale !== undefined ? { imageStartScale } : {}),
    ...(socialDuration !== undefined ? { socialDuration } : {}),
    ...(socialStagger !== undefined ? { socialStagger } : {}),
    ...(socialOffsetY !== undefined ? { socialOffsetY } : {}),
  };

  return (
    <FullscreenNav {...config}>
      {(isOpen) => <CustomNavbar {...content} isOpen={isOpen} overlayBg={config.overlayBg} delay={config.openDuration} />}
    </FullscreenNav>
  );
}
