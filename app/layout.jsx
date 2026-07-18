import "./globals.css";

export const metadata = {
  title: "Tweede Brein",
  description: "Dashboard dat je week plant en zelf voorstellen doet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
