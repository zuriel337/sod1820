import { useRef } from "react";

export function useMatrixDrag(scrollRef) {
  const dragRef = useRef({ active: false, moved: false });
  const stopDrag = (event) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    try { if (el?.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId); } catch { /* noop */ }
    el?.classList.remove("is-dragging");
    setTimeout(() => { dragRef.current.moved = false; }, 0);
  };

  const onPointerDown = (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
    };

  };

  const onPointerMove = (event) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag.active || drag.pointerId !== event.pointerId) return;
    if (event.buttons === 0) { stopDrag(event); return; }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4 && !drag.moved) {
      drag.moved = true;
      // Capture only a real drag; capturing pointerdown retargets ordinary letter clicks.
      try { el.setPointerCapture(event.pointerId); } catch { /* noop */ }
      el.classList.add("is-dragging");
    }
    el.scrollLeft = drag.left - dx;
    el.scrollTop = drag.top - dy;
  };

  return { dragRef, onPointerDown, onPointerMove, onPointerUp: stopDrag, onPointerCancel: stopDrag };
}
