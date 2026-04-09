import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Describes a column the importer should look for in the CSV.
 * - `key`: the field name in the output object (must match the Zod schema key)
 * - `label`: human-readable column name shown in the mapping UI
 * - `aliases`: alternative header names that auto-map to this column (case-insensitive)
 * - `required`: if true, rows missing this column value are invalid (default: false)
 */
export interface CsvColumnConfig {
  key: string;
  label: string;
  aliases?: string[];
  required?: boolean;
}

export interface CsvImporterResult<T = Record<string, string>> {
  /** Rows that passed Zod validation */
  validRows: T[];
  /** Rows that failed validation, with per-row error messages */
  invalidRows: { rowIndex: number; raw: Record<string, string>; errors: string[] }[];
}

interface CsvImporterProps<T extends z.ZodType<Record<string, unknown>>> {
  /** Zod schema to validate each row against. Supports ZodObject, ZodEffects (with .refine()), etc. */
  schema: T;
  /** Column definitions — controls auto-detection, mapping UI, and labels. */
  columns: CsvColumnConfig[];
  /** Called with validated results when the user confirms the import. */
  onComplete: (result: CsvImporterResult<z.infer<T>>) => void;
  /** Optional: max rows allowed (default: 10000) */
  maxRows?: number;
  /** Optional: custom label for the confirm button */
  confirmLabel?: string;
  /** Whether the parent is processing the results (disables the button) */
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// CSV parsing (zero-dependency)
// ---------------------------------------------------------------------------

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  // Character-by-character parser that correctly handles quoted fields
  // containing newlines, commas, and escaped quotes.
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\r") {
        // handle \r\n or bare \r as row terminator
        row.push(current.trim());
        current = "";
        if (row.some((c) => c !== "")) rows.push(row);
        row = [];
        if (i + 1 < text.length && text[i + 1] === "\n") i++;
      } else if (ch === "\n") {
        row.push(current.trim());
        current = "";
        if (row.some((c) => c !== "")) rows.push(row);
        row = [];
      } else {
        current += ch;
      }
    }
  }

  // Flush last field / row
  row.push(current.trim());
  if (row.some((c) => c !== "")) rows.push(row);

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0];
  return { headers, rows: rows.slice(1) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CsvImporter<T extends z.ZodType<Record<string, unknown>>>({
  schema,
  columns,
  onComplete,
  maxRows = 10000,
  confirmLabel = "Import",
  isLoading = false,
}: CsvImporterProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, number | null>>({});
  const [validationResult, setValidationResult] = useState<CsvImporterResult<z.infer<T>> | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto-detect column mappings from header names
  const autoDetectMapping = useCallback(
    (headers: string[]): Record<string, number | null> => {
      const map: Record<string, number | null> = {};
      const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

      for (const col of columns) {
        // Try exact match on key
        let idx = lowerHeaders.findIndex((h) => h === col.key.toLowerCase());
        // Try exact match on label
        if (idx === -1) idx = lowerHeaders.findIndex((h) => h === col.label.toLowerCase());
        // Try aliases
        if (idx === -1 && col.aliases) {
          for (const alias of col.aliases) {
            idx = lowerHeaders.findIndex((h) => h.includes(alias.toLowerCase()));
            if (idx !== -1) break;
          }
        }
        map[col.key] = idx >= 0 ? idx : null;
      }
      return map;
    },
    [columns]
  );

  const handleFile = (file: File) => {
    setParseError(null);
    setValidationResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCsvText(text);

      if (headers.length === 0) {
        setParseError("File is empty or has no headers.");
        return;
      }
      if (rows.length === 0) {
        setParseError("No data rows found (only a header row).");
        return;
      }
      if (rows.length > maxRows) {
        setParseError(`Too many rows (${rows.length}). Maximum is ${maxRows.toLocaleString()}.`);
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);
      setColumnMap(autoDetectMapping(headers));
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleValidateAndPreview = () => {
    const valid: z.infer<T>[] = [];
    const invalid: CsvImporterResult["invalidRows"] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const obj: Record<string, string> = {};

      for (const col of columns) {
        const colIdx = columnMap[col.key];
        if (colIdx != null && colIdx < row.length && row[colIdx]) {
          obj[col.key] = row[colIdx];
        }
      }

      const result = schema.safeParse(obj);
      if (result.success) {
        valid.push(result.data);
      } else {
        const errors = result.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`
        );
        invalid.push({ rowIndex: i + 2, raw: obj, errors }); // +2 for 1-indexed + header row
      }
    }

    setValidationResult({ validRows: valid, invalidRows: invalid });
  };

  const handleClear = () => {
    setFileName(null);
    setParseError(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMap({});
    setValidationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mappedColumnCount = Object.values(columnMap).filter((v) => v != null).length;
  const hasRequiredMapped = columns
    .filter((c) => c.required)
    .every((c) => columnMap[c.key] != null);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!fileName && (
        <div
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50 hover:bg-muted/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop a CSV file, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Up to {maxRows.toLocaleString()} rows
          </p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={handleFileInput}
      />

      {parseError && <p className="text-sm text-destructive">{parseError}</p>}

      {/* File loaded — show mapping UI */}
      {fileName && csvHeaders.length > 0 && (
        <>
          {/* File bar */}
          <Card>
            <CardContent className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{csvRows.length} rows</Badge>
                <Badge variant="outline">{csvHeaders.length} columns</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Column mapping */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Column Mapping</Label>
            <p className="text-xs text-muted-foreground">
              Map CSV columns to the expected fields. Auto-detected where possible.
            </p>
            <div className="rounded-md border divide-y">
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {col.label}
                      {col.required && <span className="text-destructive ml-0.5">*</span>}
                    </span>
                  </div>
                  <select
                    className="rounded-md border bg-background px-2 py-1 text-sm min-w-[180px]"
                    value={columnMap[col.key] ?? ""}
                    onChange={(e) =>
                      setColumnMap((prev) => ({
                        ...prev,
                        [col.key]: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">— Not mapped —</option>
                    {csvHeaders.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview first 5 rows */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Preview (first 5 rows)</Label>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">#</th>
                    {columns.map((col) => (
                      <th key={col.key} className="px-3 py-1.5 text-left font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                      {columns.map((col) => {
                        const idx = columnMap[col.key];
                        const val = idx != null && idx < row.length ? row[idx] : "";
                        return (
                          <td key={col.key} className="px-3 py-1.5 font-mono truncate max-w-[200px]">
                            {val || <span className="text-muted-foreground">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validate button */}
          {!validationResult && (
            <Button
              onClick={handleValidateAndPreview}
              disabled={mappedColumnCount === 0 || !hasRequiredMapped}
              variant="outline"
              className="w-full"
            >
              Validate {csvRows.length} rows
            </Button>
          )}

          {/* Validation results */}
          {validationResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{validationResult.validRows.length} valid</span>
                </div>
                {validationResult.invalidRows.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span>{validationResult.invalidRows.length} invalid (will be skipped)</span>
                  </div>
                )}
              </div>

              {/* Show first few errors */}
              {validationResult.invalidRows.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1 max-h-32 overflow-y-auto">
                  {validationResult.invalidRows.slice(0, 5).map((err) => (
                    <p key={err.rowIndex} className="text-xs text-destructive">
                      Row {err.rowIndex}: {err.errors.join("; ")}
                    </p>
                  ))}
                  {validationResult.invalidRows.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ...and {validationResult.invalidRows.length - 5} more errors
                    </p>
                  )}
                </div>
              )}

              {/* Confirm */}
              <Button
                onClick={() => onComplete(validationResult)}
                disabled={validationResult.validRows.length === 0 || isLoading}
                className="w-full"
              >
                {confirmLabel} ({validationResult.validRows.length} rows)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
