import { useState, useRef, useCallback } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = [10, 25, 50];

const DEBOUNCE_MS = 300;

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  page: number;
  pageSize: number;
  onPageSizeChange: (v: number) => void;
  total: number;
  showFilters: boolean;
  onToggleFilters: () => void;
  reportingCode: string;
  timestampFrom: string;
  timestampTo: string;
  subtotalMin: string;
  subtotalMax: string;
  onFilterChange: (key: string, value: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  page,
  pageSize,
  onPageSizeChange,
  total,
  showFilters,
  onToggleFilters,
  reportingCode,
  timestampFrom,
  timestampTo,
  subtotalMin,
  subtotalMax,
  onFilterChange,
  hasActiveFilters,
  onClearFilters,
}: FilterBarProps) {
  const rangeText =
    total === 0
      ? "No results"
      : `${page * pageSize + 1}\u2013${Math.min((page + 1) * pageSize, total)} of ${total}`;

  return (
    <div className="px-4 lg:px-8 pb-4 space-y-3">
      <div className="flex items-start md:items-center gap-3 flex-col md:flex-row">
        <div className="flex flex-row gap-x-2 gap-y-1 justify-between md:justify-start w-full md:w-max">
          <SearchInput value={search} onChange={onSearchChange} />

          <Button
            variant="outline"
            size="sm"
            className={`h-8 gap-1.5 text-sm bg-transparent ${
              showFilters || hasActiveFilters
                ? "border-ring text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            onClick={onToggleFilters}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-foreground ml-0.5" />
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={onClearFilters}
            >
              <X className="w-3 h-3" />
              Clear
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{rangeText}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[100px] text-xs border-border bg-card text-foreground dark:border-zinc-700 dark:bg-background dark:text-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <ExpandedFilters
            reportingCode={reportingCode}
            timestampFrom={timestampFrom}
            timestampTo={timestampTo}
            subtotalMin={subtotalMin}
            subtotalMax={subtotalMax}
            onFilterChange={onFilterChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const [prev, setPrev] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  if (prev !== value) {
    setPrev(value);
    setLocal(value);
  }

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), DEBOUNCE_MS);
  };

  const handleClear = () => {
    setLocal("");
    clearTimeout(timerRef.current);
    onChange("");
  };

  return (
    <div className="relative flex-1 min-w-[140px] max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <Input
        placeholder="Search by reporting code..."
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-9 h-8 text-sm bg-card border-border focus-visible:ring-ring/40 text-foreground placeholder:text-muted-foreground"
      />
      {local && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface ExpandedFiltersProps {
  reportingCode: string;
  timestampFrom: string;
  timestampTo: string;
  subtotalMin: string;
  subtotalMax: string;
  onFilterChange: (key: string, value: string) => void;
}

function ExpandedFilters({
  reportingCode,
  timestampFrom,
  timestampTo,
  subtotalMin,
  subtotalMax,
  onFilterChange,
}: ExpandedFiltersProps) {
  const parentValues = {
    reporting_code: reportingCode,
    timestamp_from: timestampFrom,
    timestamp_to: timestampTo,
    subtotal_min: subtotalMin,
    subtotal_max: subtotalMax,
  };
  const [locals, setLocals] = useState(parentValues);
  const [prevParent, setPrevParent] = useState(parentValues);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Sync from parent (e.g. when clear filters is pressed) — render-time adjustment
  const parentChanged = Object.keys(parentValues).some(
    (k) =>
      parentValues[k as keyof typeof parentValues] !==
      prevParent[k as keyof typeof prevParent],
  );
  if (parentChanged) {
    setPrevParent(parentValues);
    setLocals(parentValues);
  }

  const handleChange = useCallback(
    (key: string, value: string, type?: string) => {
      setLocals((prev) => ({ ...prev, [key]: value }));
      // Date inputs apply immediately (user picks from calendar)
      if (type === "date") {
        onFilterChange(key, value);
        return;
      }
      clearTimeout(timersRef.current[key]);
      timersRef.current[key] = setTimeout(
        () => onFilterChange(key, value),
        DEBOUNCE_MS,
      );
    },
    [onFilterChange],
  );

  const fields = [
    {
      label: "Reporting Code",
      key: "reporting_code",
      value: locals.reporting_code,
      placeholder: "e.g. 8081",
    },
    {
      label: "Date From",
      key: "timestamp_from",
      value: locals.timestamp_from,
      placeholder: "YYYY-MM-DD",
      type: "date" as const,
    },
    {
      label: "Date To",
      key: "timestamp_to",
      value: locals.timestamp_to,
      placeholder: "YYYY-MM-DD",
      type: "date" as const,
    },
    {
      label: "Min Subtotal",
      key: "subtotal_min",
      value: locals.subtotal_min,
      placeholder: "0.00",
    },
    {
      label: "Max Subtotal",
      key: "subtotal_max",
      value: locals.subtotal_max,
      placeholder: "999.99",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl border border-border bg-background">
        {fields.map(({ label, key, value, placeholder, type }) => (
          <div key={key} className="min-w-0 space-y-1">
            {" "}
    
            <label className="text-[11px] text-muted-foreground font-medium">
              {label}
            </label>
            <Input
              type={type ?? "text"}
              placeholder={placeholder}
              value={value}
              onChange={(e) => handleChange(key, e.target.value, type)}
              className="h-8 w-full min-w-0 text-xs bg-card border-border text-foreground placeholder:text-muted-foreground
          dark:bg-background dark:border-zinc-700 dark:text-zinc-300 dark:placeholder:text-zinc-600"
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
