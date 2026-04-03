import {
  User,
  Building2,
  MapPin,
  Briefcase,
  GraduationCap,
  Globe,
  Users,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ProfileResult {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  headline?: string | null;
  summary?: string | null;
  profile_pic?: string | null;
  primary_slug?: string;
  connection_count?: number | null;
  follower_count?: number | null;
  industry_name?: string | null;
  inferred_location?: {
    city?: string | null;
    state_name?: string | null;
    country_name?: string | null;
  } | null;
  experiences?: Array<{
    company_name?: string | null;
    title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean | null;
  }> | null;
  education?: Array<{
    school_name?: string | null;
    degree?: string | null;
    field_of_study_name?: string | null;
  }> | null;
  skills?: string[] | null;
  tags?: string[] | null;
  open_to_work?: boolean | null;
}

interface CompanyResult {
  name?: string | null;
  headline?: string | null;
  description?: string | null;
  slug?: string;
  employee_count?: number | null;
  follower_count?: number | null;
  founded_year?: number | null;
  website?: string | null;
  domain?: string | null;
  industries?: Array<{ name: string; primary?: boolean | null }> | null;
  specialties?: string[] | null;
  inferred_location?: {
    city?: string | null;
    state_name?: string | null;
    country_name?: string | null;
  } | null;
}

interface LinkedInLiveResultProps {
  type: "profile" | "company";
  profile?: ProfileResult | null;
  company?: CompanyResult | null;
}

export function LinkedInLiveResult({ type, profile, company }: LinkedInLiveResultProps) {
  if (type === "profile" && profile) return <ProfileCard profile={profile} />;
  if (type === "company" && company) return <CompanyCard company={company} />;
  return null;
}

function ProfileCard({ profile }: { profile: ProfileResult }) {
  const displayName = profile.name ?? [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const loc = profile.inferred_location;
  const locationStr = loc ? [loc.city, loc.state_name, loc.country_name].filter(Boolean).join(", ") : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {profile.profile_pic ? (
            <img src={profile.profile_pic} alt={displayName || "Profile photo"} className="h-12 w-12 rounded-full border object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <CardTitle className="text-lg">{displayName || "Unknown"}</CardTitle>
            {profile.headline && <p className="text-sm text-muted-foreground">{profile.headline}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.summary && <p className="text-sm text-muted-foreground">{profile.summary}</p>}

        <div className="grid grid-cols-2 gap-3 text-sm">
          {locationStr && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {locationStr}
            </div>
          )}
          {profile.industry_name && (
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {profile.industry_name}
            </div>
          )}
          {profile.connection_count != null && (
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              {profile.connection_count.toLocaleString()} connections
            </div>
          )}
        </div>

        {profile.open_to_work && <Badge className="bg-green-600 text-xs">Open to Work</Badge>}

        {profile.experiences && profile.experiences.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Experience</h4>
              {profile.experiences.slice(0, 4).map((exp, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{exp.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.company_name} · {exp.start_date ?? "?"} – {exp.is_current ? "Present" : (exp.end_date ?? "?")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {profile.education && profile.education.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Education</h4>
              {profile.education.map((edu, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{edu.school_name}</p>
                    {edu.degree && <p className="text-xs text-muted-foreground">{edu.degree}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {profile.skills && profile.skills.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-1.5 text-sm font-medium">Skills</h4>
              <div className="flex flex-wrap gap-1">
                {profile.skills.slice(0, 12).map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
                {profile.skills.length > 12 && <Badge variant="outline" className="text-xs">+{profile.skills.length - 12}</Badge>}
              </div>
            </div>
          </>
        )}

        {profile.primary_slug && (
          <a
            href={`https://www.linkedin.com/in/${profile.primary_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> View on LinkedIn
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function CompanyCard({ company }: { company: CompanyResult }) {
  const loc = company.inferred_location;
  const locationStr = loc ? [loc.city, loc.state_name, loc.country_name].filter(Boolean).join(", ") : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded border bg-muted">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">{company.name || "Unknown"}</CardTitle>
            {company.headline && <p className="text-sm text-muted-foreground">{company.headline}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {company.description && <p className="text-sm text-muted-foreground">{company.description}</p>}

        <div className="grid grid-cols-2 gap-3 text-sm">
          {locationStr && (
            <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" />{locationStr}</div>
          )}
          {company.employee_count != null && (
            <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-foreground" />{company.employee_count.toLocaleString()} employees</div>
          )}
          {company.founded_year && (
            <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-muted-foreground" />Founded {company.founded_year}</div>
          )}
          {company.website && (
            <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
              <Globe className="h-4 w-4" />{company.domain ?? company.website}
            </a>
          )}
        </div>

        {company.industries && company.industries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {company.industries.map((ind) => (
              <Badge key={ind.name} variant="outline" className="text-xs">{ind.name}</Badge>
            ))}
          </div>
        )}

        {company.specialties && company.specialties.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-sm font-medium">Specialties</h4>
            <div className="flex flex-wrap gap-1">
              {company.specialties.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {company.slug && (
          <a
            href={`https://www.linkedin.com/company/${company.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> View on LinkedIn
          </a>
        )}
      </CardContent>
    </Card>
  );
}
