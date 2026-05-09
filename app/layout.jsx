import "./globals.css";

export const metadata = {
  title: "Workout Timer",
  description: "A voice-guided counting timer for workouts, with rest gaps and full time controls.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#EFE8DB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
