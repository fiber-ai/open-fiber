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
  Briefcase,
  GitBranch,
  MessageSquare,
  Repeat,
  Youtube,
  Music2,
  Instagram,
  BarChart3,
  Ghost,
  HardHat,
  Image,
  Plane,
  Home,
  Building2,
  Camera,
  FileSearch,
  Share2,
  Upload,
  Link2,
  BookmarkCheck,
  Fingerprint,
  PieChart,
  ArrowRightLeft,
  LineChart,
  CookingPot,
  Trophy,
  Sparkles,
  ScanSearch,
  Contact,
  BedDouble,
  Webhook,
  History,
  Utensils,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditBadge } from "./credit-badge";
import { XLogo } from "@/components/icons/x-logo";
import { RedditLogo } from "@/components/icons/reddit-logo";

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
      { label: "Job Postings", href: "/search/job-postings", icon: Briefcase },
      { label: "Stealth Founders", href: "/search/stealth", icon: Ghost },
      { label: "Blue-Collar Jobs", href: "/search/blue-collar", icon: HardHat },
    ],
  },
  {
    label: "Enrichment",
    items: [
      { label: "Single Lookup", href: "/enrichment/single", icon: Mail },
      { label: "Contact Reveal", href: "/enrichment/contact-reveal", icon: Contact },
      { label: "Kitchen Sink", href: "/enrichment/kitchen-sink", icon: CookingPot },
      { label: "Batch Enrichment", href: "/enrichment/batch", icon: Users },
      { label: "LinkedIn Live", href: "/enrichment/linkedin-live", icon: Globe },
      { label: "Bulk Enrich", href: "/enrichment/bulk", icon: Users },
    ],
  },
  {
    label: "Audiences",
    items: [
      { label: "All Audiences", href: "/audiences", icon: Users },
      { label: "Saved Searches", href: "/saved-searches", icon: BookmarkCheck },
    ],
  },
  {
    label: "Market Intelligence",
    items: [
      { label: "Flights", href: "/market/flights", icon: Plane },
      { label: "Hotels", href: "/market/hotels", icon: BedDouble },
      { label: "Real Estate", href: "/market/real-estate", icon: Home },
      { label: "Finance", href: "/market/finance", icon: LineChart },
      { label: "Company Rankings", href: "/market/rankings", icon: Trophy },
    ],
  },
  {
    label: "Trackers",
    items: [
      { label: "Company Trackers", href: "/trackers/companies", icon: Building2 },
      { label: "People Trackers", href: "/trackers/people", icon: Users },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Google Maps", href: "/tools/google-maps", icon: MapPin },
      { label: "Yelp", href: "/tools/yelp", icon: Utensils },
      { label: "Depth Chart", href: "/tools/depth-chart", icon: BarChart3 },
      { label: "Department Size", href: "/tools/department-size", icon: PieChart },
      { label: "Talent Flow", href: "/tools/talent-flow", icon: ArrowRightLeft },
      { label: "Quick Resolve", href: "/tools/quick-resolve", icon: Fingerprint },
      { label: "Logos & Photos", href: "/tools/logos", icon: Image },
      { label: "Webpage Screenshot", href: "/tools/screenshot", icon: Camera },
      { label: "Domain Lookup", href: "/tools/domain-lookup", icon: Globe },
      { label: "Reverse Lookup", href: "/tools/reverse-lookup", icon: ScanSearch },
      { label: "Email Validation", href: "/tools/email-validation", icon: ShieldCheck },
      { label: "Phone Validation", href: "/tools/phone-validation", icon: ShieldCheck },
      { label: "GitHub Lookups", href: "/tools/github-lookups", icon: GitBranch },
      { label: "LinkedIn Posts", href: "/tools/linkedin-posts", icon: MessageSquare },
      { label: "Job Changes", href: "/tools/job-changes", icon: Repeat },
      { label: "Scouting Report", href: "/tools/scouting-report", icon: FileSearch },
      { label: "Social Media", href: "/tools/social-media", icon: Share2 },
      { label: "Company Import", href: "/tools/company-import", icon: Upload },
      { label: "URL Repair", href: "/tools/url-repair", icon: Link2 },
      { label: "Mosaic", href: "/tools/mosaic", icon: Sparkles },
    ],
  },
  {
    label: "Social",
    items: [
      { label: "Twitter / X", href: "/tools/twitter", icon: XLogo },
      { label: "YouTube", href: "/tools/youtube", icon: Youtube },
      { label: "Reddit", href: "/tools/reddit", icon: RedditLogo },
      { label: "TikTok", href: "/tools/tiktok", icon: Music2 },
      { label: "Instagram", href: "/tools/instagram", icon: Instagram },
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
      { label: "Webhooks", href: "/account/webhooks", icon: Webhook },
      { label: "API Request Log", href: "/account/api-requests", icon: History },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Rendered inside the mobile drawer: always expanded, toggle closes the drawer. */
  variant?: "rail" | "drawer";
  className?: string;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FiberMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <path
        d="M8 10h16M8 16h12M8 22h8"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Sidebar({ collapsed: collapsedProp, onToggle, variant = "rail", className }: SidebarProps) {
  const router = useRouter();
  const isDrawer = variant === "drawer";
  const collapsed = isDrawer ? false : collapsedProp;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card transition-[width] duration-200 ease-out",
        isDrawer ? "w-72" : collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center px-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-1 text-[15px] font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FiberMark className="h-6 w-6" />
            OpenFiber
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onToggle}
          aria-label={isDrawer ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={isDrawer ? true : !collapsed}
        >
          {isDrawer ? (
            <X className="h-4 w-4" />
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {!collapsed && (
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = isActivePath(router.pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    collapsed && "justify-center",
                    isActive
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
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
