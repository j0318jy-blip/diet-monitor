import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { PlusCircle, ClipboardList, Send } from "lucide-react";

const navItems = [
  { href: "/", label: "기록하기", icon: PlusCircle },
  { href: "/history", label: "기록목록", icon: ClipboardList },
  { href: "/send", label: "전송하기", icon: Send },
];

export default function BottomNav() {
  const [location] = useHashLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-background/95 backdrop-blur border-t border-border">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-${label}`}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? "text-primary" : ""}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
