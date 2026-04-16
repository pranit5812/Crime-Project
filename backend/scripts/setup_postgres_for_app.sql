-- Fix "password authentication failed for user postgres"
-- -----------------------------------------------------------------
-- 1. Open pgAdmin → connect to your local server (use any login that still works).
-- 2. Tools → Query Tool, paste below, replace YOUR_PASSWORD with the exact text of
--    POSTGRES_PASSWORD in backend/.env (same spelling, same @ if you use one).
-- 3. Execute (F5). Then restart uvicorn.
--
-- If you cannot log in at all: stop PostgreSQL, edit data\pg_hba.conf, change
-- "scram-sha-256" / "md5" to "trust" for the "127.0.0.1/32" line, start PostgreSQL,
-- run this script, then change pg_hba back and restart PostgreSQL again.

ALTER USER postgres WITH PASSWORD 'YOUR_PASSWORD';

CREATE DATABASE crime_project;

-- If CREATE DATABASE says "already exists", that is fine.
