import { Geist, Chakra_Petch } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const display = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-face" });

const description =
  "Free anime games. Draft legends for weekly battles, or play Hangu-Manu, Anime Imposter and Anime Charades with friends. Nothing to download.";
const shareTitle = "Gyokan Legends — Anime games to play solo or with friends";

export const metadata = {
  metadataBase: new URL("https://gyokanlegends.utilox.com"),
  title: "Gyokan Legends",
  description,
  openGraph: {
    title: shareTitle,
    description,
    url: "/",
    siteName: "Gyokan Legends",
    images: [{ url: "/og.png?v=5", width: 1200, height: 630, alt: "Gyokan Legends logo above five game tiles: Legends, Hangu-Manu, Imposter and Charades" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description,
    images: ["/og.png?v=5"],
  },
};

export const viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} ${geist.variable} ${display.variable} antialiased bg-black`}>
        {children}
      </body>
    </html>
  );
}
