"use client";

import React, { useRef } from 'react';

interface CarouselProps {
  children: React.ReactNode;
}

export const Carousel: React.FC<CarouselProps> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (scrollOffset: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full">
      {/* Buttons */}
      <button
        onClick={() => scroll(-ref.current!.offsetWidth)}
        className="absolute top-1/2 left-0 -translate-y-1/2 
             w-10 h-10 rounded-full 
             bg-white/10 backdrop-blur-md border border-white/20 
             text-slate-800 flex items-center justify-center 
             hover:bg-white/20 transition shadow z-10"
      >
        &#10094;
      </button>

      <button
        onClick={() => scroll(ref.current!.offsetWidth)}
        className="absolute top-1/2 right-0 -translate-y-1/2 
             w-10 h-10 rounded-full 
             bg-white/10 backdrop-blur-md border border-white/20 
             text-slate-800 flex items-center justify-center 
             hover:bg-white/20 transition shadow z-10"
      >
        &#10095;
      </button>

      {/* Carousel content with side padding */}
      <div
        ref={ref}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth px-12"
      >
        {children}
      </div>
    </div>
  );
};

export const CarouselItem: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`snap-start flex-shrink-0 ${className}`}>
      {children}
    </div>
  );
};