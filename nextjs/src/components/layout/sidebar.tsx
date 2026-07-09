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
      { label: "Real Estate", href: "/market/real-estate", icon: Home },
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
      { label: "Depth Chart", href: "/tools/depth-chart", icon: BarChart3 },
      { label: "Company Logos", href: "/tools/logos", icon: Image },
      { label: "Webpage Screenshot", href: "/tools/screenshot", icon: Camera },
      { label: "Domain Lookup", href: "/tools/domain-lookup", icon: Globe },
      { label: "Email Validation", href: "/tools/email-validation", icon: ShieldCheck },
      { label: "Phone Validation", href: "/tools/phone-validation", icon: ShieldCheck },
      { label: "GitHub Lookups", href: "/tools/github-lookups", icon: GitBranch },
      { label: "LinkedIn Posts", href: "/tools/linkedin-posts", icon: MessageSquare },
      { label: "Job Changes", href: "/tools/job-changes", icon: Repeat },
      { label: "Scouting Report", href: "/tools/scouting-report", icon: FileSearch },
      { label: "Social Media", href: "/tools/social-media", icon: Share2 },
      { label: "Company Import", href: "/tools/company-import", icon: Upload },
      { label: "URL Repair", href: "/tools/url-repair", icon: Link2 },
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
