-- Supabase exposes every table in the public schema through its REST API using the
-- public anon key. This app only talks to the database through Prisma (which connects
-- as the postgres role and bypasses RLS), so we turn RLS on with no policies:
-- the anon/authenticated API roles can then read nothing (no answers, no password hashes).
ALTER TABLE "Team"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Track"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QrCode"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamTrack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attempt"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scan"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting"   ENABLE ROW LEVEL SECURITY;
