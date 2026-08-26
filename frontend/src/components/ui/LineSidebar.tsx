import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface LineSidebarItem {
  label: string;
  id?: string;
  href?: string;
  onClick?: () => void;
}

export interface LineSidebarProps {
  items: (string | LineSidebarItem)[];
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  activeColor?: string;
  showIndex?: boolean;
  showMarker?: boolean;
  proximityRadius?: number;
  maxShift?: number;
  falloff?: "smooth" | "linear";
  markerLength?: number;
  itemGap?: number;
  fontSize?: number;
  smoothing?: number;
  activeIndex?: number;
  onItemSelect?: (item: string | LineSidebarItem, index: number) => void;
  className?: string;
}

export const LineSidebar: React.FC<LineSidebarProps> = ({
  items = [],
  accentColor = "#19D3AE",
  textColor = "#8FA3B8",
  markerColor = "#2A3948",
  activeColor = "#19D3AE",
  showIndex = true,
  showMarker = true,
  proximityRadius = 90,
  maxShift = 18,
  falloff = "smooth",
  markerLength = 42,
  itemGap = 14,
  fontSize = 0.82,
  activeIndex = 0,
  onItemSelect,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseY, setMouseY] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    setMouseY(relativeY);
    setIsHovering(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setMouseY(null);
    setIsHovering(false);
  }, []);

  // Calculate shift and scale for an item based on pointer proximity
  const calculateProximity = (index: number) => {
    if (mouseY === null || !isHovering) return { shift: 0, scale: 1, opacity: 0.7 };

    const itemEl = itemRefs.current[index];
    if (!itemEl || !containerRef.current) return { shift: 0, scale: 1, opacity: 0.7 };

    const containerRect = containerRef.current.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();
    const itemCenterY = itemRect.top - containerRect.top + itemRect.height / 2;

    const distance = Math.abs(mouseY - itemCenterY);

    if (distance > proximityRadius) {
      return { shift: 0, scale: 1, opacity: 0.7 };
    }

    const normalized = 1 - distance / proximityRadius;
    let factor = normalized;

    if (falloff === "smooth") {
      // Cubic ease-out curve for smooth magnetic feel
      factor = Math.sin((normalized * Math.PI) / 2);
    }

    const shift = factor * maxShift;
    const scale = 1 + factor * 0.08;
    const opacity = 0.7 + factor * 0.3;

    return { shift, scale, opacity };
  };

  const normalizedItems: LineSidebarItem[] = items.map((item) =>
    typeof item === "string" ? { label: item } : item
  );

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "hidden lg:flex flex-col select-none py-2 px-1 relative z-30 transition-all duration-200",
        className
      )}
      style={{ gap: `${itemGap}px` }}
      aria-label="Contextual Section Navigation"
    >
      {normalizedItems.map((item, index) => {
        const { shift, scale, opacity } = calculateProximity(index);
        const isActive = activeIndex === index;

        const formattedIndex = String(index + 1).padStart(2, "0");

        return (
          <button
            key={item.label || index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            type="button"
            onClick={() => {
              if (item.onClick) {
                item.onClick();
              } else if (item.href) {
                if (item.href.startsWith("#")) {
                  const targetEl = document.querySelector(item.href);
                  if (targetEl) {
                    targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }
              }
              onItemSelect?.(item, index);
            }}
            className="group relative flex items-center text-left transition-transform duration-150 ease-out cursor-pointer py-1 pr-4 focus-visible:outline-none"
            style={{
              transform: `translateX(${shift}px) scale(${scale})`,
              transformOrigin: "left center",
            }}
          >
            {/* Visual Line Marker */}
            {showMarker && (
              <div
                className="transition-all duration-200 shrink-0 mr-2.5 rounded-full"
                style={{
                  width: isActive ? `${markerLength}px` : `${markerLength * 0.65}px`,
                  height: isActive ? "2.5px" : "1.5px",
                  backgroundColor: isActive
                    ? activeColor
                    : isHovering && shift > 4
                    ? accentColor
                    : markerColor,
                }}
              />
            )}

            {/* Index Number */}
            {showIndex && (
              <span
                className="font-mono text-[10px] mr-2 shrink-0 transition-colors duration-150"
                style={{
                  color: isActive ? activeColor : "#4B5563",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {formattedIndex}
              </span>
            )}

            {/* Label Text */}
            <span
              className="font-sans font-medium whitespace-nowrap transition-all duration-150 tracking-tight"
              style={{
                fontSize: `${fontSize}rem`,
                color: isActive ? "#FFFFFF" : isHovering && shift > 4 ? "#E2E8F0" : textColor,
                opacity: isActive ? 1 : opacity,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.label}
            </span>

            {/* Active Glow Accent Indicator */}
            {isActive && (
              <span
                className="ml-2 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: activeColor }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default LineSidebar;
