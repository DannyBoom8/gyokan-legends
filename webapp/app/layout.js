import { Geist, Chakra_Petch, Anton } from "next/font/google";
import "./globals.css";
import "./manga.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const display = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-face" });

const poster = Anton({ weight: "400", subsets: ["latin"], variable: "--font-poster" });

const description =
  "Assemble your anime legends and lead them into battle against your rivals.";
const shareTitle = "Gyokan Legends — Your rival is waiting";

export const metadata = {
  metadataBase: new URL("https://legends.utilox.com"),
  title: "Gyokan Legends",
  description,
  openGraph: {
    title: shareTitle,
    description,
    url: "/",
    siteName: "Gyokan Legends",
    images: [{ url: "/og.png?v=11", width: 1200, height: 630, alt: "Two pairs of glaring eyes face off above and below the Gyokan Legends logo. Your rival is waiting." }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description,
    images: ["/og.png?v=11"],
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9e4d6" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" },
  ],
  viewportFit: "cover",
};

// runs before first paint so there is no flash: saved mode (light, dark or auto) -> data-theme on <html>
const themeScript = `(function(){try{var m=localStorage.getItem('gyokan-theme')||'auto';var t=m==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):m;var r=document.documentElement;r.dataset.mode=m;r.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={`${geist.className} ${geist.variable} ${display.variable} ${poster.variable} antialiased bg-black`}>
        {children}
      </body>
    </html>
  );
}
