"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, ClipboardList, AlertCircle, Boxes, Loader2 } from "lucide-react";
import { searchGlobal } from "@/lib/actions/search";
import type { SearchResult } from "@/lib/actions/search";
import { cn } from "@/lib/utils";

const TIPO_META: Record<SearchResult["tipo"], { label: string; icon: React.ElementType; href: string }> = {
  ot:         { label: "Orden de trabajo", icon: ClipboardList, href: "/ordenes"    },
  incidencia: { label: "Incidencia",       icon: AlertCircle,   href: "/incidencias" },
  equipo:     { label: "Equipo",           icon: Boxes,         href: "/equipos"    },
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, start]      = useTransition();

  // Ctrl+K / Cmd+K — skip when user is typing in an input
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    start(async () => {
      const data = await searchGlobal(query);
      setResults(data);
    });
  }, [query]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(TIPO_META[result.tipo].href);
  }

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  if (!open) return null;

  const grupos = (["ot", "incidencia", "equipo"] as const).map((tipo) => ({
    tipo,
    items: results.filter((r) => r.tipo === tipo),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={close}
      />

      {/* Panel */}
      <div className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-bg-primary shadow-2xl">
        <Command shouldFilter={false} className="flex flex-col">
          {/* Input */}
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            {pending
              ? <Loader2 size={15} className="shrink-0 animate-spin text-text-tertiary" />
              : <Search size={15} className="shrink-0 text-text-tertiary" />
            }
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar OTs, incidencias, equipos…"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              autoFocus
            />
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-text-tertiary sm:block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {!pending && query && results.length === 0 && (
              <Command.Empty className="py-8 text-center text-sm text-text-tertiary">
                Sin resultados para &ldquo;{query}&rdquo;
              </Command.Empty>
            )}

            {!query && (
              <div className="py-6 text-center text-xs text-text-tertiary">
                Escribe para buscar en el sistema
              </div>
            )}

            {grupos.map((grupo, gi) => {
              const { label, icon: Icon } = TIPO_META[grupo.tipo];
              return (
                <Command.Group key={grupo.tipo}>
                  <div className={cn("mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary", gi > 0 && "mt-3")}>
                    {label}s
                  </div>
                  {grupo.items.map((result) => (
                    <Command.Item
                      key={result.id}
                      value={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm aria-selected:bg-brand-blue-light aria-selected:text-brand-blue"
                    >
                      <Icon size={14} className="shrink-0 text-text-tertiary" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-text-primary">{result.titulo}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                          <span className="font-mono">{result.numero}</span>
                          {result.subtitulo && <><span>·</span><span>{result.subtitulo}</span></>}
                        </div>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="text-[10px] text-text-tertiary">
              <kbd className="rounded border border-border px-1">↑↓</kbd> navegar &nbsp;
              <kbd className="rounded border border-border px-1">↵</kbd> ir &nbsp;
              <kbd className="rounded border border-border px-1">Ctrl+K</kbd> cerrar
            </span>
            {results.length > 0 && (
              <span className="text-[10px] text-text-tertiary">{results.length} resultado{results.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </Command>
      </div>
    </>
  );
}
