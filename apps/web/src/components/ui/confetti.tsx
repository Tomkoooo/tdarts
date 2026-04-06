"use client";

import React, { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
}

export const Confetti: React.FC = () => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    // Generate 50 confetti pieces
    const pieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1,
      color: [
        "bg-primary",
        "bg-accent",
        "bg-success",
        "bg-info",
        "bg-warning",
      ][Math.floor(Math.random() * 5)],
    }));

    setConfetti(pieces);

    // Clean up after animation completes
    const timer = setTimeout(() => {
      setConfetti([]);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className={`absolute w-2 h-2 ${piece.color} rounded-full`}
          style={{
            left: `${piece.left}%`,
            top: "-10px",
            animation: `confetti-fall ${piece.duration}s ease-in forwards`,
            animationDelay: `${piece.delay}s`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
};
