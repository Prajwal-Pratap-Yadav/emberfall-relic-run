import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMBERFALL — Relic Run & Squad Survival",
  description: "Raid relic sites, fight the Ash Warden and escape with dash and grenades. Play solo Relic Run or classic squad battle royale. Free, original browser action.",
  metadataBase: new URL("https://emberfall-squads.daintypear3.chatgpt.site"),
  openGraph: { title: "EMBERFALL — Relic Run & Squad Survival", description: "Raid the ruins. Break the Warden. Get the relics. Get out alive.", images: [{ url: "/assets/keyart.webp", width: 1672, height: 941 }] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#102727" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
