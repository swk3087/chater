import "./globals.css";
import { Providers } from "@/app/(ui)/providers";
import { InjectMyId } from "@/components/InjectMyId";

export const metadata = {
  title: "Vercel Chat",
  description: "Google 로그인 + 방코드 + Pusher 실시간 채팅"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="ko">
      <body>
        <InjectMyId />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
