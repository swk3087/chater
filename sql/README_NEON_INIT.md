# Neon DB 초기화 (Prisma CLI 없이)

## 1) 어디서 실행하나요?
- Neon 콘솔 → Project → **SQL Editor** 열기
- 또는 psql/데스크탑 클라이언트에서도 OK

## 2) 무엇을 실행하나요?
- `001_init.sql` 파일 전체를 복사해서 SQL Editor에 붙여넣고 **Run**.

## 3) 그 다음은?
- 앱은 그대로 Prisma Client를 사용합니다.
- Termux에선 Prisma CLI/엔진이 동작하지 않으므로 **로컬 개발은 제약**이 있습니다.
- 대신 **Vercel 빌드 환경**에서 `@prisma/client`가 자동 생성(postinstall)되며 정상 동작합니다.
  - Vercel 환경변수: DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, PUSHER_*
- 로컬에서 꼭 실행해야 한다면:
  - (권장) PC/서버(리눅스 x64/arm64 gnu)에서 `prisma generate` 후 실행
  - (대안) NextAuth를 JWT 전략으로 전환 + SQL 직접 호출 레이어로 교체(구조 변경 큼)

## 4) 주의
- 이 SQL은 Prisma schema와 동형입니다. **데이터 무결성/제약**을 그대로 반영합니다.
- 모든 id는 앱에서 cuid() 문자열로 생성되므로 DB에서 자동생성하지 않습니다.
