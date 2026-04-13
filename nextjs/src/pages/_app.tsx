import App, { type AppProps, type AppContext } from "next/app";
import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import Head from "next/head";
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

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout =
    Component.getLayout ?? ((page) => <AppLayout>{page}</AppLayout>);

  return (
    <>
      <Head>
        <title>OpenFiber</title>
      </Head>
      {getLayout(<Component {...pageProps} />)}
      <Toaster />
      <GlobalToastListener />
    </>
  );
}

// Disable Automatic Static Optimization — this is a client-side dashboard
// and useRouter from next/router requires the Pages Router context at render time.
MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  return { ...appProps };
};

export default trpc.withTRPC(MyApp);
