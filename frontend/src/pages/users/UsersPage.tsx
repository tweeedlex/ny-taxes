import { TooltipProvider } from "@/components/ui/tooltip";
import { UsersHeader } from "./components/UsersHeader";

export default function UsersPage() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <UsersHeader />
      </div>
      
    </TooltipProvider>
  );
}
