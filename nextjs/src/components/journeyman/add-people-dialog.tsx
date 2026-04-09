import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface AddPeopleDialogProps {
  onSubmit: (linkedinUrls: string[]) => void;
  isLoading: boolean;
}

export function AddPeopleDialog({ onSubmit, isLoading }: AddPeopleDialogProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const urls = input
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urls.length === 0) return;
    onSubmit(urls);
    setInput("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Add People
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add People to Track</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>LinkedIn URLs (one per line)</Label>
            <Textarea
              className="min-h-[160px] font-mono text-xs"
              placeholder={"https://www.linkedin.com/in/person-1\nhttps://www.linkedin.com/in/person-2\nhttps://www.linkedin.com/in/person-3"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {urls.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {urls.length} {urls.length === 1 ? "person" : "people"} to add
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={urls.length === 0 || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {urls.length > 0 ? `${urls.length} People` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
