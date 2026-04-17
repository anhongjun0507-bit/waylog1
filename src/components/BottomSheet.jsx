import { useRef, useState } from "react";
import { cls } from "../utils/ui.js";
import { useExit } from "../hooks.js";

/**
 * 공통 BottomSheet 모달.
 * - overlay 탭으로 닫기
 * - 아래로 드래그하여 닫기 (스크롤 맨 위일 때만)
 * - slide-up/down 애니메이션
 * - drag handle 바
 *
 * Props:
 *  onClose, dark, children,
 *  maxH ("90vh" | "85vh" | "88vh"), z (40|50|60)
 */
export const BottomSheet = ({ onClose, dark, children, maxH = "90vh", z = 50 }) => {
  const [exiting, close] = useExit(onClose);
  const sheetRef = useRef(null);
  const startY = useRef(null);
  const [dragY, setDragY] = useState(0);

  const onStart = (e) => {
    if (sheetRef.current && sheetRef.current.scrollTop > 0) return;
    startY.current = e.touches?.[0]?.clientY ?? e.clientY;
  };
  const onMove = (e) => {
    if (startY.current == null) return;
    const dy = (e.touches?.[0]?.clientY ?? e.clientY) - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onEnd = () => {
    if (dragY > 120) close();
    else setDragY(0);
    startY.current = null;
  };

  return (
    <div className={cls(`fixed inset-0 z-[${z}] max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto flex items-end`, exiting ? "" : "animate-fade-in")}
      role="dialog" aria-modal="true">
      <div className={cls("absolute inset-0 bg-black/50", exiting ? "animate-fade-out" : "")} onClick={close}/>
      <div ref={sheetRef}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
        className={cls("relative w-full rounded-t-3xl shadow-2xl pb-safe overflow-y-auto",
          dark ? "bg-gray-900" : "bg-white",
          exiting ? "animate-slide-down" : "animate-slide-up")}
        style={{
          maxHeight: maxH,
          ...(dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: "none", opacity: Math.max(0.5, 1 - dragY / 400) } : {}),
        }}>
        <div className={cls("w-12 h-1 rounded-full mx-auto mt-3 mb-2 cursor-grab", dark ? "bg-gray-700" : "bg-gray-300")}/>
        {children}
      </div>
    </div>
  );
};
