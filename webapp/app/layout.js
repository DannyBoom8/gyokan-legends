import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

const description = "Sign 10 anime legends with 100M gold. Every Thursday they battle. Rise. Battle. Become Legend.";

export const metadata = {
  metadataBase: new URL("https://gyokanlegends.utilox.com"),
  title: "Gyokan Legends",
  description,
  openGraph: {
    title: "Gyokan Legends",
    description,
    url: "/",
    siteName: "Gyokan Legends",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Gyokan Legends — Rise. Battle. Become Legend." }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gyokan Legends",
    description,
    images: ["/og.png"],
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
