import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { LocaleProvider } from "@/components/settings/locale-provider";
import { ThemeProvider } from "@/components/settings/theme-provider";
import { UiPreferencesProvider } from "@/components/settings/ui-preferences-provider";
import { ToasterProvider } from "@/components/ui/toaster-provider";
import { getMessage } from "@/lib/i18n/messages";
import { LOCALE_COOKIE_KEY, resolveInitialLocale } from "@/lib/preferences/locale";
import { themeInitScript } from "@/lib/preferences/theme";
import {
  DEFAULT_MOTION_PREFERENCE,
  DEFAULT_SHOW_COMPLETED_TASKS_PREFERENCE,
  DEFAULT_WEEK_START_PREFERENCE,
  isMotionPreference,
  isWeekStartPreference,
  parseShowCompletedPreference,
  UI_MOTION_COOKIE_KEY,
  UI_SHOW_COMPLETED_COOKIE_KEY,
  UI_WEEK_START_COOKIE_KEY,
  uiPreferencesInitScript,
} from "@/lib/preferences/ui";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const locale = resolveInitialLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE_KEY)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
  const appTitle = getMessage(locale, "app.title");
  const appDescription = getMessage(locale, "app.description");

  return {
    title: appTitle,
    description: appDescription,
    applicationName: appTitle,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: ["/favicon.ico"],
    },
    appleWebApp: {
      capable: true,
      title: appTitle,
      statusBarStyle: "default",
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const initialLocale = resolveInitialLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE_KEY)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
  const cookieWeekStart = cookieStore.get(UI_WEEK_START_COOKIE_KEY)?.value;
  const initialWeekStart = isWeekStartPreference(cookieWeekStart)
    ? cookieWeekStart
    : DEFAULT_WEEK_START_PREFERENCE;
  const cookieShowCompleted = cookieStore.get(UI_SHOW_COMPLETED_COOKIE_KEY)?.value;
  const initialShowCompletedTasks =
    parseShowCompletedPreference(cookieShowCompleted) ?? DEFAULT_SHOW_COMPLETED_TASKS_PREFERENCE;
  const cookieMotion = cookieStore.get(UI_MOTION_COOKIE_KEY)?.value;
  const initialMotionPreference = isMotionPreference(cookieMotion)
    ? cookieMotion
    : DEFAULT_MOTION_PREFERENCE;
  const initialResolvedMotion = initialMotionPreference === "reduce" ? "reduce" : "no-preference";

  return (
    <html
      lang={initialLocale}
      data-locale={initialLocale}
      data-week-start={initialWeekStart}
      data-show-completed={initialShowCompletedTasks ? "1" : "0"}
      data-motion-preference={initialMotionPreference}
      data-motion={initialResolvedMotion}
      suppressHydrationWarning
    >
      <head>
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script id="ui-preferences-init" dangerouslySetInnerHTML={{ __html: uiPreferencesInitScript }} />
      </head>
      <body
        className={`${manrope.variable} ${ibmPlexMono.variable} safe-px safe-pt safe-pb min-h-[100dvh] antialiased`}
      >
        <ThemeProvider>
          <PwaRegister />
          <LocaleProvider initialLocale={initialLocale}>
            <UiPreferencesProvider
              initialWeekStart={initialWeekStart}
              initialShowCompletedTasks={initialShowCompletedTasks}
              initialMotionPreference={initialMotionPreference}
            >
              <ToasterProvider>{children}</ToasterProvider>
            </UiPreferencesProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
