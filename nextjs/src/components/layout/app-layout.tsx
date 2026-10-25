import { useState } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { BrandLogo } from "./brand-logo";
import { brand } from "@/config/brand";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Desktop rail */}
      <div className="hidden h-full md:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile: top bar + navigation drawer. Radix Dialog handles the focus trap,
          Escape, backdrop click, scroll lock and returning focus to the menu button. */}
      <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 md:hidden">
            <DialogPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Trigger>
            <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <BrandLogo />
              {brand.name}
            </Link>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 shadow-xl duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <Sidebar
              variant="drawer"
              collapsed={false}
              onToggle={() => setDrawerOpen(false)}
              onNavigate={() => setDrawerOpen(false)}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
