import { ExternalLink, MapPin, Users, Briefcase, GraduationCap, Building2, Globe, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FiberAvatar } from "./fiber-avatar";

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" ? v : null);
const yr = (d: unknown) => (typeof d === "string" ? d.slice(0, 4) : "");

/** Card for the raw (snake_case) LinkedIn person shape the lookup endpoints return. */
export function PersonProfileCard({ p }: { p: Row }) {
  const loc = (p.inferred_location ?? null) as Row | null;
  const exps = ((p.experiences ?? []) as Row[]).slice(0, 6);
  const edu = ((p.education ?? []) as Row[]).slice(0, 3);
  const skills = ((p.skills ?? []) as string[]).slice(0, 14);
  const url = str(p.url) ?? (str(p.primary_slug) ? `https://www.linkedin.com/in/${p.primary_slug}` : null);
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start gap-3">
          <FiberAvatar src={str(p.profile_pic)} alt={str(p.name) ?? ""} type="person" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold">
              {str(p.name) ?? [p.first_name, p.last_name].filter(Boolean).join(" ")}
              {url && <a href={url} target="_blank" rel="noreferrer" aria-label="Open LinkedIn profile" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
            </p>
            {str(p.headline) && <p className="text-sm text-muted-foreground">{str(p.headline)}</p>}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {(str(loc?.formatted_address) ?? str(p.locality)) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{str(loc?.formatted_address) ?? str(p.locality)}</span>}
              {num(p.follower_count) != null && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{num(p.follower_count)!.toLocaleString()} followers</span>}
              {num(p.connection_count) != null && <span>{num(p.connection_count)!.toLocaleString()} connections</span>}
            </div>
          </div>
        </div>
        {exps.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Briefcase className="h-3 w-3" />Experience</p>
            <ol className="space-y-1.5 border-l pl-3">
              {exps.map((e, i) => (
                <li key={i} className="relative text-sm">
                  <span className={`absolute -left-[17px] top-1.5 h-2 w-2 rounded-full ${e.is_current ? "bg-success" : "bg-muted-foreground/40"}`} />
                  <span className="font-medium">{str(e.title) ?? "—"}</span>
                  <span className="text-muted-foreground"> · {str(e.company_name)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{yr(e.start_date)}–{e.is_current ? "now" : yr(e.end_date)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {edu.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><GraduationCap className="h-3 w-3" />Education</p>
            {edu.map((e, i) => (
              <p key={i} className="text-sm">
                {str(e.school_name)}
                <span className="text-muted-foreground">{[str(e.degree), str(e.field_of_study_name)].filter(Boolean).length ? ` · ${[str(e.degree), str(e.field_of_study_name)].filter(Boolean).join(", ")}` : ""}</span>
              </p>
            ))}
          </div>
        )}
        {skills.length > 0 && <div className="flex flex-wrap gap-1">{skills.map((s) => <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>)}</div>}
      </CardContent>
    </Card>
  );
}

/** Card for the raw (snake_case) LinkedIn company shape. */
export function CompanyProfileCard({ c }: { c: Row }) {
  const loc = (c.inferred_location ?? null) as Row | null;
  const industries = ((c.industries ?? c.standardized_industries ?? []) as unknown[]).map((i) => (typeof i === "string" ? i : str((i as Row)?.name))).filter(Boolean) as string[];
  const emp = num(c.employee_count);
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start gap-3">
          <FiberAvatar src={str(c.logo_url)} alt={str(c.name) ?? ""} type="company" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold">
              {str(c.name)}
              {str(c.linkedin_url) && <a href={str(c.linkedin_url)!} target="_blank" rel="noreferrer" aria-label="Open LinkedIn company page" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
            </p>
            {str(c.headline) && <p className="text-sm text-muted-foreground">{str(c.headline)}</p>}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {str(c.website) && <a href={str(c.website)!} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground"><Globe className="h-3 w-3" />{str(c.domain) ?? str(c.website)}</a>}
              {emp != null && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{emp.toLocaleString()} employees</span>}
              {num(c.founded_year) != null && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Founded {num(c.founded_year)}</span>}
              {str(loc?.formatted_address) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{str(loc?.formatted_address)}</span>}
            </div>
          </div>
        </div>
        {str(c.description) && <p className="line-clamp-4 text-sm text-muted-foreground">{str(c.description)}</p>}
        {industries.length > 0 && <div className="flex flex-wrap gap-1">{industries.slice(0, 6).map((i) => <Badge key={i} variant="secondary" className="font-normal">{i}</Badge>)}</div>}
      </CardContent>
    </Card>
  );
}
