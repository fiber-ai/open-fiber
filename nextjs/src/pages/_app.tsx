import type { AppProps } from "next/app";
import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import "@/styles/globals.css";

export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function GlobalToastListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        title: string;
        description: string;
        variant: "default" | "destructive";
      };
      toast({
        title: detail.title,
        description: detail.description,
        variant: detail.variant,
      });
    };

    window.addEventListener("fiber-toast", handler);
    return () => window.removeEventListener("fiber-toast", handler);
  }, [toast]);

  return null;
}

function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout =
    Component.getLayout ?? ((page) => <AppLayout>{page}</AppLayout>);

  return (
    <>
      {getLayout(<Component {...pageProps} />)}
      <Toaster />
      <GlobalToastListener />
    </>
  );
}

export default trpc.withTRPC(App);
