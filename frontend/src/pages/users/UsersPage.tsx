import { TooltipProvider } from "@/components/ui/tooltip";
import { UsersHeader } from "./components/UsersHeader";
import { FilterBarUsers } from "./components/FilterBarUsers";

export default function UsersPage() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <UsersHeader />
        <FilterBarUsers />
      </div>
      
    </TooltipProvider>
  );
}
