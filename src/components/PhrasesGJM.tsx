import React, { useState, useEffect } from "react";

export const PHRASES_GJM = [
  "Micro-Fantom Searching...",
  "Vertical Search...",
  "Federated Search...",
  "Domain-Specific Search...",
];

interface PhrasesGJMProps {
  title?: string;
  id?: string;
  className?: string;
}

export const PhrasesGJM: React.FC<PhrasesGJMProps> = ({
  title,
  id,
  className = "",
}) => {
  const [index, setIndex] = useState(0);

  // Switch phrase every 1 second (1000ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES_GJM.length);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const displayTitle = title || (id ? `ID: ${id}` : "Stream");
  const currentPhrase = PHRASES_GJM[index];

  return (
    <div
      className={`shining-phrase font-mono text-xs sm:text-sm font-bold tracking-wider select-none text-center ${className}`}
    >
      <span key={index} className="inline-block animate-fade-in">
        ◈ {displayTitle} - {currentPhrase}
      </span>
    </div>
  );
};
