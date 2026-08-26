"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export const FocusCards = ({
  cards,
  renderCard,
  className,
}: {
  cards: any[];
  renderCard: (card: any, index: number, isHovered: boolean, isAnyHovered: boolean) => React.ReactNode;
  className?: string;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full", className)}>
      {cards.map((card, index) => (
        <div
          key={card.id || index}
          onMouseEnter={() => setHovered(index)}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            "transition-all duration-300 ease-out",
            hovered !== null && hovered !== index && "opacity-40 blur-[1px] scale-[0.98]",
            hovered === index && "scale-[1.01] shadow-2xl z-10"
          )}
        >
          {renderCard(card, index, hovered === index, hovered !== null)}
        </div>
      ))}
    </div>
  );
};

export default FocusCards;
