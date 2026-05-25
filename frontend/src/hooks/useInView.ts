import { useEffect, useRef } from "react";

/**
 * useInView
 *
 * Adds the "is-visible" class to the referenced element when it enters
 * the viewport. Used to trigger CSS-only reveal animations (.reveal class).
 *
 * @param threshold  – how much of the element must be visible (0–1, default 0.15)
 * @param once       – whether to unobserve after first trigger (default true)
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
  once = true
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove("is-visible");
        }
      },
      { threshold }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [threshold, once]);

  return ref;
}
