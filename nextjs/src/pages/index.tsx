import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const router = useRouter();
  const credits = trpc.utility.getCredits.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (credits.isError) {
      router.replace("/setup");
    } else if (credits.isSuccess) {
      router.replace("/search/companies");
    }
  }, [credits.isError, credits.isSuccess, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}
