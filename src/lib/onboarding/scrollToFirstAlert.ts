/**
 * Scroll to the first validation alert after React has committed error UI.
 * Calling querySelector in the same turn as setErrors/setSubmitted finds
 * stale DOM and leaves the customer on the Complete button with no visible reason.
 */
export function scrollToFirstAlert(): void {
  const run = () => {
    const first = document.querySelector("[role='alert']");
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  if (typeof requestAnimationFrame === "undefined") {
    setTimeout(run, 0);
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}
