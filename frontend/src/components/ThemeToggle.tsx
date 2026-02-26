import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme , toggle} = useTheme();

  return (
    <div className={`flex justify-end p-4 ${className}`}>
      <button onClick={() => toggle()}>
        {theme === "dark" ? 
          <Sun size={22} className="text-foreground" />
         : 
          <Moon size={22} className="text-foreground" />
        }
      </button>
    </div>
  );
}
