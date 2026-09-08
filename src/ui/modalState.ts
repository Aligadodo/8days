type ModalVisibility = Pick<HTMLElement, "hidden">;

/** Visibility owns pause even before an overlay's fade-in class is applied. */
export const hasVisibleModal = (overlays: ModalVisibility[]) => overlays.some(overlay => !overlay.hidden);
export const canOpenDrawer = (overlays: ModalVisibility[], dying: boolean) => !dying && !hasVisibleModal(overlays);

/** Keep keyboard navigation inside a modal instead of reaching background HUD controls. */
export function trapModalTab(event: Pick<KeyboardEvent, "key" | "shiftKey" | "preventDefault">,
  overlay: Pick<HTMLElement, "hidden" | "querySelectorAll">, active: Element | null): boolean {
  if (overlay.hidden || event.key !== "Tab") return false;
  const controls = Array.from(overlay.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [href], [tabindex='0']"))
    .filter(element => !element.hidden);
  event.preventDefault();
  if (!controls.length) return true;
  const current = controls.findIndex(element => element === active);
  const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0)
    : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
  controls[next].focus();
  return true;
}
