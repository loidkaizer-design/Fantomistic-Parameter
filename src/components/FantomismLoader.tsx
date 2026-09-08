import React from "react";

interface FantomismLoaderProps {
  label?: React.ReactNode;
  subLabel?: React.ReactNode;
  className?: string;
  scale?: number;
}

export const FantomismLoader: React.FC<FantomismLoaderProps> = ({
  label,
  subLabel,
  className = "",
  scale = 1,
}) => {
  return (
    <div
      className={`fantomism-official-loader-container select-none ${className}`}
      role="status"
    >
      <div
        className="fantomism-official-spinner transition-transform duration-300"
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      >
        <div />
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>

      {label && (
        <div className="mt-5 text-center px-4 animate-fade-in flex flex-col items-center">
          {typeof label === "string" ? (
            <p className="text-white text-xs font-mono uppercase tracking-[0.2em] font-semibold">
              {label}
            </p>
          ) : (
            label
          )}
          {subLabel && (
            typeof subLabel === "string" ? (
              <p className="text-neutral-400 text-[11px] font-mono tracking-wide mt-1 max-w-[320px] truncate">
                {subLabel}
              </p>
            ) : (
              subLabel
            )
          )}
        </div>
      )}
    </div>
  );
};
