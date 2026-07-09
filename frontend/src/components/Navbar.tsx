import { Droplet, Calculator, Ruler, ShieldAlert, GitBranch } from "lucide-react";

export type TabKey = "calculator" | "conversion" | "killsheet" | "geometry";

interface NavbarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "calculator", label: "Drilling Calculator", icon: <Calculator size={18} /> },
  { key: "conversion", label: "Unit Conversion", icon: <Ruler size={18} /> },
  { key: "killsheet", label: "Well Control Kill Sheet", icon: <ShieldAlert size={18} /> },
  { key: "geometry", label: "Wellbore Geometry", icon: <GitBranch size={18} /> },
];

export default function Navbar({ active, onChange }: NavbarProps) {
  return (
    <header className="bg-pertamina-navy text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Droplet className="text-pertamina-red" size={26} />
          <div>
            <h1 className="text-lg font-bold leading-tight">
              Pertamina Offshore Drilling
            </h1>
            <p className="text-xs text-slate-300 leading-tight">
              Drilling Engineering Workspace
            </p>
          </div>
        </div>

        <nav className="flex gap-1 bg-white/5 rounded-lg p-1 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  active === tab.key
                    ? "bg-pertamina-red text-white shadow"
                    : "text-slate-200 hover:bg-white/10"
                }`}
            >
              {tab.icon}
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
