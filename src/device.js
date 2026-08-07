export function isMobileOrTablet() {
  const ua = navigator.userAgent || "";
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;
  const hasCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const hasTouch =
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
    (typeof window !== "undefined" && "ontouchstart" in window);

  return (
    mobileRegex.test(ua) ||
    (hasTouch && hasCoarsePointer && window.innerWidth <= 900)
  );
}
