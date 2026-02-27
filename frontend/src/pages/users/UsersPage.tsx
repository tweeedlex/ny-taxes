import { TooltipProvider } from "@/components/ui/tooltip";
import { UsersHeader } from "./components/UsersHeader";
import { FilterBarUsers } from "./components/FilterBarUsers";
import { UsersTable } from "./components/UsersTable";
import type { UserRow } from "./components/UserTableRow";

const MOCK_USERS: UserRow[] = [
  {
    id: 1,
    name: "Alex Morgan",
    email: "alex.m@nytaxes.gov",
    username: "admin",
    permissions: ["edit_orders", "edit_users", "view_stats"],
    createdAt: "Jan 10, 2025",
  },
    {
    id: 1,
    name: "Nasu Saul",
    email: "alex.m@nytaxes.gov",
    username: "admin",
    permissions: ["edit_orders", "edit_users", "view_stats"],
    createdAt: "Jan 10, 2025",
  },
    {
    id: 1,
    name: "Yaga Ndon",
    email: "alex.m@nytaxes.gov",
    username: "admin",
    permissions: ["edit_orders", "edit_users", "view_stats"],
    createdAt: "Jan 10, 2025",
  },
    {
    id: 1,
    name: "Yanach ",
    email: "alex.m@nytaxes.gov",
    username: "admin",
    permissions: ["edit_orders", "edit_users", "view_stats"],
    createdAt: "Jan 10, 2025",
  },
    {
    id: 1,
    name: "Alex Morgan",
    email: "alex.m@nytaxes.gov",
    username: "admin",
    permissions: ["edit_orders", "view_stats"],
    createdAt: "Jan 10, 2025",
  },
    {
    id: 1,
    name: "Alex Morgan",
    email: "alex.m@nytaxes.gov",
    username: "admin",
    permissions: ["edit_orders", "edit_users", "view_stats"],
    createdAt: "Jan 10, 2025",
  },
  // ...
];

export default function UsersPage() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col">
        <UsersHeader />
        <FilterBarUsers />
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <UsersTable users={MOCK_USERS} />
          
        </div>
      </div>
    </TooltipProvider>
  );
}