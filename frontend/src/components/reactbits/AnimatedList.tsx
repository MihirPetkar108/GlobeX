import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

export interface AnimatedListRenderState {
  selected: boolean;
}

export interface AnimatedListProps<T = any> {
  items?: T[];
  renderItem?: (item: T, index: number, state: AnimatedListRenderState) => React.ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  maxHeight?: string;
  listId?: string;
}

interface AnimatedItemProps {
  children: React.ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: () => void;
  onClick?: () => void;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({
  children,
  delay = 0,
  index,
  onMouseEnter,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: false });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.95, opacity: 0, y: 8 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.95, opacity: 0, y: 8 }}
      transition={{ duration: 0.2, delay, ease: [0.22, 1, 0.36, 1] }}
      className="mb-2 cursor-pointer last:mb-0"
    >
      {children}
    </motion.div>
  );
};

export const AnimatedList = <T extends any = any>({
  items = [],
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
  maxHeight = "400px",
  listId,
}: AnimatedListProps<T>) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item: T, index: number) => {
      setSelectedIndex(index);
      if (onItemSelect) {
        onItemSelect(item, index);
      }
    },
    [onItemSelect]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setTopGradientOpacity(Math.min(scrollTop / 30, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 30, 1));
  }, []);

  // Keyboard navigation scoped to this list when focused or hovered
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enableArrowNavigation || !items.length) return;

      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, items.length - 1);
          scrollToItem(next);
          return next;
        });
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollToItem(next);
          return next;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) {
            onItemSelect(items[selectedIndex], selectedIndex);
          }
        }
      }
    },
    [items, selectedIndex, onItemSelect, enableArrowNavigation]
  );

  const scrollToItem = (index: number) => {
    if (!listRef.current) return;
    const container = listRef.current;
    const itemEl = container.querySelector(`[data-index="${index}"]`) as HTMLElement;
    if (itemEl) {
      const extraMargin = 20;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = itemEl.offsetTop;
      const itemBottom = itemTop + itemEl.offsetHeight;

      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <div
      className={`relative w-full focus-visible:outline-none ${className}`}
      tabIndex={enableArrowNavigation ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      data-list-id={listId}
    >
      <div
        ref={listRef}
        className={`overflow-y-auto p-1 focus-visible:outline-none ${
          displayScrollbar
            ? "[&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-emerald-400"
            : "scrollbar-none"
        }`}
        onScroll={handleScroll}
        style={{
          maxHeight,
          scrollbarWidth: displayScrollbar ? "thin" : "none",
          scrollbarColor: "rgba(15,23,42,0.16) transparent",
        }}
      >
        {items.map((item, index) => {
          const isSelected = selectedIndex === index;
          return (
            <AnimatedItem
              key={index}
              delay={0.02 * (index % 5)}
              index={index}
              onMouseEnter={() => handleItemMouseEnter(index)}
              onClick={() => handleItemClick(item, index)}
            >
              {renderItem ? (
                <div>
                  {renderItem(item, index, { selected: isSelected })}
                </div>
              ) : (
                <div
                  className={`p-3 rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-300 text-slate-900"
                      : "bg-white border-slate-200/90 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                  } ${itemClassName}`}
                >
                  <p className="text-xs font-sans m-0 leading-relaxed font-medium">
                    {typeof item === "string" ? item : JSON.stringify(item)}
                  </p>
                </div>
              )}
            </AnimatedItem>
          );
        })}
      </div>

      {showGradients && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent pointer-events-none transition-opacity duration-200 ease-out z-10"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none transition-opacity duration-200 ease-out z-10"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  );
};

export default AnimatedList;
