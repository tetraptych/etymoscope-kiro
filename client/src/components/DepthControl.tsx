interface DepthControlProps {
  value: number;
  onChange: (value: number) => void;
}

export default function DepthControl({ value, onChange }: DepthControlProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="depth-slider" className="text-base font-medium whitespace-nowrap">
        Depth:
      </label>
      <input
        id="depth-slider"
        type="range"
        min="1"
        max="3"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-24 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
        aria-label="Graph depth control"
      />
      <span className="text-xl font-semibold w-5 text-center">{value}</span>
    </div>
  );
}
