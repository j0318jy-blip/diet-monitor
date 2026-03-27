import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 32 32"
          width="28"
          height="28"
          fill="none"
          aria-label="식이모니터링 로고"
          className="text-primary"
        >
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
          <path d="M10 18 C10 12 14 10 16 10 C18 10 22 12 22 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="21" r="2.5" fill="currentColor" />
          <path d="M8 22 L24 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="font-bold text-base text-foreground tracking-tight">식이모니터링</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDark(!dark)}
        className="w-9 h-9"
        aria-label="다크모드 전환"
        data-testid="button-theme-toggle"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </Button>
    </header>
  );
}
