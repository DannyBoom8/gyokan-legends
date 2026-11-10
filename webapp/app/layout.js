import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

const description =
  "Draft 10 anime legends with 100M gold. Every Thursday they battle, and every win climbs you from Rookie to Legendary. Free to play.";
const shareTitle = "Gyokan Legends — Fantasy anime battles every Thursday";

export const metadata = {
  metadataBase: new URL("https://gyokanlegends.utilox.com"),
  title: "Gyokan Legends",
  description,
  openGraph: {
    title: shareTitle,
    description,
    url: "/",
    siteName: "Gyokan Legends",
    images: [{ url: "/og.png?v=2", width: 1200, height: 630, alt: "Gyokan Legends: three fighter cards with ratings and power types beside the Gyokan Legends logo" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description,
    images: ["/og.png?v=2"],
  },
};

export const viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased bg-black`}>
        {children}
      </body>
    </html>
  );
}
