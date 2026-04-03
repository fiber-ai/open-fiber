import type { ReactElement } from "react";
import { useState } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiKeyInput } from "@/components/shared/api-key-input";
import type { NextPageWithLayout } from "./_app";

const SetupPage: NextPageWithLayout = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (apiKey: string) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const res = await fetch("/api/set-api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!res.ok) {
        throw new Error("Failed to save API key");
      }

      router.replace("/");
    } catch {
      setError("Failed to save API key. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to OpenFiber</CardTitle>
          <CardDescription>
            Connect your Fiber AI API key to get started with prospecting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyInput onSubmit={handleSubmit} isLoading={isLoading} error={error} />
        </CardContent>
      </Card>
    </div>
  );
};

SetupPage.getLayout = (page: ReactElement) => page;

export default SetupPage;
