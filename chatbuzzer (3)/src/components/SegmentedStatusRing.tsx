import React from "react";

interface SegmentedStatusRingProps {
  count: number;
  unviewedCount: number;
  size?: number;
  strokeWidth?: number;
  avatarUrl?: string | null;
  fallbackText?: string;
  className?: string;
  onClick?: () => void;
}

export const SegmentedStatusRing: React.FC<SegmentedStatusRingProps> = ({
  count,
  unviewedCount,
  size = 54,
  strokeWidth = 2.5,
  avatarUrl,
  fallbackText = "?",
  className = "",
  onClick,
}) => {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const isAllViewed = unviewedCount === 0;

  // Render SVG segments if count > 0
  const renderSegments = () => {
    if (count <= 0) return null;

    if (count === 1) {
      return (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isAllViewed ? "#8696a0" : "#00a884"}
          strokeWidth={strokeWidth}
        />
      );
    }

    const gap = 4; // gap in degrees between segments
    const totalGapDegrees = gap * count;
    const availableDegrees = 360 - totalGapDegrees;
    const segmentDegrees = availableDegrees / count;
    const segmentLength = (segmentDegrees / 360) * circumference;
    const gapLength = (gap / 360) * circumference;

    const segments = [];
    // Unviewed statuses are colored WhatsApp green, viewed are muted gray
    const viewedCount = count - unviewedCount;

    for (let i = 0; i < count; i++) {
      // viewed items first or unviewed items highlighted
      const isSegmentUnviewed = i >= viewedCount;
      const strokeColor = isSegmentUnviewed ? "#00a884" : "#8696a0";
      // Dashoffset starts from top (-90 degrees)
      const offset = -(i * (segmentLength + gapLength));

      segments.push(
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      );
    }
    return segments;
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center shrink-0 cursor-pointer select-none transition-transform active:scale-95 ${className}`}
      style={{ width: size, height: size }}
    >
      {count > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {renderSegments()}
        </svg>
      )}

      {/* Inner Avatar */}
      <div
        className="rounded-full overflow-hidden flex items-center justify-center font-bold text-white bg-slate-300 dark:bg-slate-700"
        style={{
          width: size - strokeWidth * 2 - 4,
          height: size - strokeWidth * 2 - 4,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fallbackText}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs uppercase text-slate-800 dark:text-slate-200">
            {fallbackText.slice(0, 2)}
          </span>
        )}
      </div>
    </div>
  );
};
