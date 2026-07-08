-- ============================================================
-- Le Cinéma Hainault — Realtime & concurrency-safety migration
-- Run this in Supabase: Project > SQL Editor > New Query > Run
-- Safe to run even if you already ran SUPABASE_SETUP.md's original
-- CREATE TABLE statements — this only adds what's missing.
-- ============================================================

-- 1) Prevent double-booking at the database level.
--    This is the real fix for two people booking the same seat at the
--    same instant: the second INSERT is rejected outright (Postgres
--    error code 23505), instead of relying on the client to check first
--    (which can't catch a true race between two browsers).
ALTER TABLE reservations
  ADD CONSTRAINT unique_seat_per_movie UNIQUE (movie_id, seat);

-- 2) Turn on Realtime so every connected browser sees new or cancelled
--    reservations the instant they happen, without refreshing.
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;

-- Optional: also sync live changes to the movie catalog (so if an admin
-- adds/edits/deletes a movie in one tab, other open tabs update too).
ALTER PUBLICATION supabase_realtime ADD TABLE movies;

-- ============================================================
-- Notes
-- ============================================================
-- * If ALTER PUBLICATION fails with "relation is already member of
--   publication", that table is already realtime-enabled — ignore it.
-- * If ADD CONSTRAINT fails because you already have duplicate
--   (movie_id, seat) rows from earlier testing, clear the table first:
--     TRUNCATE TABLE reservations;
--   then re-run this migration.
-- * The app.js client already maps camelCase <-> snake_case for you
--   (movieId <-> movie_id, etc.) — no further changes needed there.
