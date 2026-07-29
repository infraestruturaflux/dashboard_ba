import { useState, useRef, useEffect } from "react";
import { ANALISTAS } from "@/constants/analistas";
import { Input } from "@/components/ui/input";
import { ChevronDown, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalystCombobox({ value, onChange, placeholder = "Buscar analista…", disabled }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState(value || "");
  const containerRef      = useRef(null);

  const filtered = query.trim()
    ? ANALISTAS.filter((a) => a.toLowerCase().includes(query.toLowerCase()))
    : ANALISTAS;

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        // Se não selecionou nada válido, limpa o valor parcial
        if (!ANALISTAS.includes(query)) {
          setQuery(value || "");
        }
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value]);

  // Sincroniza query quando value muda externamente
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  function select(name) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  function handleInputChange(e) {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-8 pr-8"
          autoComplete="off"
        />
        <ChevronDown
          className={cn(
            "absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground transition-transform cursor-pointer",
            open && "rotate-180"
          )}
          onClick={() => setOpen((v) => !v)}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-xl overflow-hidden">
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((name) => (
              <li
                key={name}
                onMouseDown={(e) => { e.preventDefault(); select(name); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors",
                  value === name && "bg-primary/10"
                )}
              >
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1">{name}</span>
                {value === name && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-xl px-3 py-3 text-sm text-muted-foreground">
          Nenhum analista encontrado.
        </div>
      )}
    </div>
  );
}
