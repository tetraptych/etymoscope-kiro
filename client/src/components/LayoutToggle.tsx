import { Network, GitBranch } from "lucide-react";

interface LayoutToggleProps {
  layout: "force" | "radial";
  onChange: (layout: "force" | "radial") => void;
}

export default function LayoutToggle({ layout, onChange }: LayoutToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
      <button
        onClick={() => onChange("radial")}
        className={`p-2 rounded-md transition-colors ${
          layout === "radial"
            ? "bg-background shadow-sm"
            : "hover:bg-background/50"
        }`}
        aria-label="Radial tree layout"
        title="Radial tree layout"
      >
        <GitBranch className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange("force")}
        className={`p-2 rounded-md transition-colors ${
          layout === "force"
            ? "bg-background shadow-sm"
            : "hover:bg-background/50"
        }`}
        aria-label="Force layout"
        title="Force layout"
      >
        <Network className="h-4 w-4" />
      </button>
    </div>
  );
}
