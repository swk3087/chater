-- Neon(PostgreSQL)용 초기 스키마
-- Prisma schema.prisma와 1:1로 매칭되는 테이블/인덱스/제약 조건
-- 앱이 cuid() 문자열을 직접 생성하므로 PK는 TEXT로 둠

-- ========== users/auth ==========
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  image TEXT,
  nickname TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Account" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  CONSTRAINT fk_account_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT uq_account_provider UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT PRIMARY KEY,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_session_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_verification UNIQUE (identifier, token)
);

-- ========== chat domain ==========
CREATE TABLE IF NOT EXISTS "Room" (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  "isDm" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_room_creator FOREIGN KEY ("createdBy") REFERENCES "User"(id)
);

CREATE TABLE IF NOT EXISTS "Membership" (
  id TEXT PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastReadAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_membership_room FOREIGN KEY ("roomId") REFERENCES "Room"(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT uq_membership UNIQUE ("roomId","userId")
);

CREATE TABLE IF NOT EXISTS "Message" (
  id TEXT PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited BOOLEAN NOT NULL DEFAULT FALSE,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_message_room FOREIGN KEY ("roomId") REFERENCES "Room"(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- updatedAt 자동 갱신 트리거(선택). 없어도 앱 레벨에서 업데이트되지만 넣어두면 안전.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."updatedAt" = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_message_updated_at'
  ) THEN
    CREATE TRIGGER trg_message_updated_at
    BEFORE UPDATE ON "Message"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "Reaction" (
  id TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL, -- 'heart'
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_reaction_message FOREIGN KEY ("messageId") REFERENCES "Message"(id) ON DELETE CASCADE,
  CONSTRAINT fk_reaction_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT uq_reaction UNIQUE ("messageId","userId","type")
);
CREATE INDEX IF NOT EXISTS idx_reaction_message ON "Reaction"("messageId");
