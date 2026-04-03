import Link from "next/link";
import { useRouter } from "next/router";
import {
  Search,
  Users,
  UserSearch,
  Mail,
  MapPin,
  Globe,
  ShieldCheck,
  Download,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Zap,
  Landmark,
  Briefcase,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditBadge } from "./credit-badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Search",
    items: [
      { label: "Companies", href: "/search/companies", icon: Search },
      { label: "Prospects", href: "/search/prospects", icon: UserSearch },
      { label: "Combined", href: "/search/combined", icon: Users },
      { label: "AI Search", href: "/search/ai", icon: Zap },
      { label: "Investors", href: "/search/investors", icon: Landmark },
      { label: "Job Postings", href: "/search/job-postings", icon: Briefcase },
    ],
  },
  {
    label: "Enrichment",
    items: [
      { label: "Single Lookup", href: "/enrichment/single", icon: Mail },
      { label: "Batch Enrichment", href: "/enrichment/batch", icon: Users },
      { label: "LinkedIn Live", href: "/enrichment/linkedin-live", icon: Globe },
    ],
  },
  {
    label: "Audiences",
    items: [
      { label: "All Audiences", href: "/audiences", icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Google Maps", href: "/tools/google-maps", icon: MapPin },
      { label: "Domain Lookup", href: "/tools/domain-lookup", icon: Globe },
      { label: "Email Validation", href: "/tools/email-validation", icon: ShieldCheck },
      { label: "Phone Validation", href: "/tools/phone-validation", icon: ShieldCheck },
      { label: "GitHub Lookups", href: "/tools/github-lookups", icon: GitBranch },
      { label: "LinkedIn Posts", href: "/tools/linkedin-posts", icon: MessageSquare },
    ],
  },
  {
    label: "Data",
    items: [
      { label: "Exclusion Lists", href: "/exclusion-lists", icon: ShieldCheck },
      { label: "Exports", href: "/exports", icon: Download },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Usage & Credits", href: "/account", icon: CreditCard },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <Link href="/" className="text-lg font-semibold tracking-tight">
            OpenFiber
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = router.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <Separator />

      <div className="p-3">
        <CreditBadge collapsed={collapsed} />
      </div>
    </aside>
  );
}
