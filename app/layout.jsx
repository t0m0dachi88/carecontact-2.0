import "./globals.css";
export const metadata = {
  title: "CareContact",
  description: "Comprehensive Healthcare Platform",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
