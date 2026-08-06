import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Reveals [data-reveal] descendants of containerRef with a stagger when they
// scroll into view. No-op under reduced-motion; elements stay visible.
export default function useGsapReveal(containerRef, { y = 30, stagger = 0.08, start = "top 88%", once = true } = {}) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = el.querySelectorAll("[data-reveal]");
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        y,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger,
        scrollTrigger: { trigger: el, start, once },
      });
    }, el);

    return () => ctx.revert();
  }, [containerRef, y, stagger, start, once]);
}
