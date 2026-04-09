import { useState } from "react";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CsvImporter, type CsvColumnConfig, type CsvImporterResult } from "@/components/shared/csv-importer";

interface BatchUploadFormProps {
  onSubmit: (urls: string[], options: { getWorkEmails: boolean; getPersonalEmails: boolean; getPhoneNumbers: boolean }) => void;
  isLoading: boolean;
}

const linkedinRowSchema = z.object({
  linkedinUrl: z.string().min(1).refine(
    (v) => v.includes("linkedin.com/in/") || v.includes("linkedin.com/pub/"),
    { message: "Must be a LinkedIn profile URL" }
  ),
});

type LinkedInRow = z.infer<typeof linkedinRowSchema>;

const COLUMNS: CsvColumnConfig[] = [
  {
    key: "linkedinUrl",
    label: "LinkedIn URL",
    aliases: ["linkedin", "url", "profile_url", "profile", "li_url", "linkedin_url"],
    required: true,
  },
];

export function BatchUploadForm({ onSubmit, isLoading }: BatchUploadFormProps) {
  const [options, setOptions] = useState({
    getWorkEmails: true,
    getPersonalEmails: false,
    getPhoneNumbers: false,
  });

  const handleComplete = (result: CsvImporterResult<LinkedInRow>) => {
    onSubmit(
      result.validRows.map((r) => r.linkedinUrl),
      options
    );
  };

  return (
    <div className="space-y-4">
      {/* Options */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Data to Fetch</Label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getWorkEmails} onCheckedChange={(v) => setOptions((p) => ({ ...p, getWorkEmails: v === true }))} />
            Work Emails
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getPersonalEmails} onCheckedChange={(v) => setOptions((p) => ({ ...p, getPersonalEmails: v === true }))} />
            Personal Emails
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={options.getPhoneNumbers} onCheckedChange={(v) => setOptions((p) => ({ ...p, getPhoneNumbers: v === true }))} />
            Phone Numbers
          </label>
        </div>
      </div>

      <CsvImporter
        schema={linkedinRowSchema}
        columns={COLUMNS}
        onComplete={handleComplete}
        maxRows={10000}
        confirmLabel="Start Batch Enrichment"
        isLoading={isLoading}
      />
    </div>
  );
}
