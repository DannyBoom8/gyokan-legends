import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "Gyokan Legends",
  description: "Rise. Battle. Become Legend.",
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