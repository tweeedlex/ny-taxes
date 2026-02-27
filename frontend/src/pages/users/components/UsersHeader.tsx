import { Users } from "lucide-react";

export function UsersHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground/70" />

          <span className="text-xs tracking-widest uppercase font-medium text-muted-foreground">
            Users
          </span>
        </div>
      </div>
    </header>
  );
}
