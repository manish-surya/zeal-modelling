import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zeal Modelling — Build, Train, and Export Real ML Models",
  description:
    "Visual wizard-driven ML platform for researchers and data scientists.",
};

// GitHub Pages SPA path-restore script
const spaScript = `
(function(){
  var q = window.location.search;
  if (q && q.slice(1,3) === 'p=') {
    var path = q.slice(3).replace(/~and~/g,'&');
    var search = '';
    var idx = path.indexOf('&q=');
    if (idx !== -1) { search = '?' + path.slice(idx+3).replace(/~and~/g,'&'); path = path.slice(0,idx); }
    window.history.replaceState(null, null,
      window.location.pathname.split('/').slice(0,2).join('/') + '/' + path + search + window.location.hash
    );
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: spaScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
