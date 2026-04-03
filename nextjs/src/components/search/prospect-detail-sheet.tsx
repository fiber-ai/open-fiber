import {
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Globe,
  ExternalLink,
  Calendar,
  Tag,
  Languages,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ProspectRow } from "./prospect-table";

interface ProspectDetailSheetProps {
  prospect: ProspectRow & {
    summary?: string | null;
    experiences?: Array<{
      title?: string;
      company_name?: string;
      start_date?: string;
      end_date?: string;
      is_current?: boolean;
    }> | null;
    education?: Array<{
      school_name?: string;
      degree?: string;
      field_of_study_name?: string;
      start_date?: string;
      end_date?: string;
    }> | null;
    skills?: string[] | null;
    languages?: Array<{ name?: string; proficiency_name?: string }> | null;
    career_began_at?: string | null;
  };
  onClose: () => void;
}

export function ProspectDetailSheet({ prospect, onClose }: ProspectDetailSheetProps) {
  const displayName =
    prospect.name ??
    ([prospect.first_name, prospect.last_name].filter(Boolean).join(" ") ||
    "Unknown");
  const loc = prospect.inferred_location;
  const locationStr = loc
    ? [loc.city, loc.state_name, loc.country_name].filter(Boolean).join(", ")
    : prospect.locality ?? null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between p-6">
        <div className="flex items-center gap-3">
          {prospect.profile_pic ? (
            <img
              src={prospect.profile_pic}
              alt={displayName}
              className="h-12 w-12 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">{displayName}</h2>
            {prospect.headline && (
              <p className="text-sm text-muted-foreground">{prospect.headline}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          ✕
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {prospect.summary && (
          <p className="text-sm text-muted-foreground">{prospect.summary}</p>
        )}

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-3">
          {prospect.current_job?.title && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm">{prospect.current_job.title}</p>
                {prospect.current_job.company_name && (
                  <p className="truncate text-xs text-muted-foreground">
                    {prospect.current_job.company_name}
                  </p>
                )}
              </div>
            </div>
          )}
          {locationStr && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{locationStr}</span>
            </div>
          )}
          {prospect.career_began_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Career since {prospect.career_began_at}</span>
            </div>
          )}
          {prospect.industry_name && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{prospect.industry_name}</span>
            </div>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1">
          {prospect.open_to_work && (
            <Badge className="bg-green-600 text-xs">Open to Work</Badge>
          )}
          {prospect.is_hiring && (
            <Badge className="bg-blue-600 text-xs">Hiring</Badge>
          )}
        </div>

        {/* Tags */}
        {prospect.tags && prospect.tags.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {prospect.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag.replace(/-/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {prospect.experiences && prospect.experiences.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Experience</h3>
            <div className="space-y-3">
              {prospect.experiences.slice(0, 5).map((exp, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                    <Briefcase className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{exp.title}</p>
                    <p className="text-xs text-muted-foreground">{exp.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.start_date ?? "?"} – {exp.is_current ? "Present" : exp.end_date ?? "?"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {prospect.education && prospect.education.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Education</h3>
            <div className="space-y-3">
              {prospect.education.map((edu, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{edu.school_name}</p>
                    {(edu.degree || edu.field_of_study_name) && (
                      <p className="text-xs text-muted-foreground">
                        {[edu.degree, edu.field_of_study_name].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {prospect.skills && prospect.skills.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Skills</h3>
            <div className="flex flex-wrap gap-1">
              {prospect.skills.slice(0, 15).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {prospect.skills.length > 15 && (
                <Badge variant="outline" className="text-xs">
                  +{prospect.skills.length - 15} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Languages */}
        {prospect.languages && prospect.languages.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Languages</h3>
            <div className="flex flex-wrap gap-1">
              {prospect.languages.map((lang, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  <Languages className="mr-1 h-3 w-3" />
                  {lang.name}
                  {lang.proficiency_name && ` (${lang.proficiency_name})`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn */}
        {prospect.primary_slug && (
          <a
            href={`https://www.linkedin.com/in/${prospect.primary_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View on LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
