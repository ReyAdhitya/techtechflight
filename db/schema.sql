-- TechTech Flight records, on Neon Postgres.
--
-- ADR-0035: the browser is the record and this is the copy. Nothing a Teacher does in a
-- lesson waits on this database; every screen writes localStorage first and succeeds with the
-- wifi off. This holds what happened, so that the same records open on another machine and
-- survive a lost laptop.
--
-- **No live readings.** No altitude, no battery, no position of an aircraft, ever. Coordinates
-- do appear — on zone corners and checkpoints — because those are what a Teacher *set*, not
-- what an airframe reported. That is the same line the product already draws between the board
-- and the Logbook, and it is the one rule in here worth refusing a pull request over.
--
-- Third normal form throughout. Three tables look like over-normalisation and are not; the
-- reason is written above each.

BEGIN;

-- ---------------------------------------------------------------------------------------
-- Who
-- ---------------------------------------------------------------------------------------

-- One row per school. Everything below hangs off this, so a deletion request is one subtree
-- rather than a hunt (ADR-0035 takes that obligation on explicitly).
CREATE TABLE IF NOT EXISTS school (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- A child on the roll. `local_id` is the browser's own `studentId`, kept so a laptop and the
-- copy can agree about who is who without inventing a second identity for the same child.
CREATE TABLE IF NOT EXISTS student (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES school (id) ON DELETE CASCADE,
  local_id      text NOT NULL,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, local_id)
);

-- An airframe. `number` is what is painted on the side, which is what a child reads and what
-- the board must agree with; `local_id` is the Fleet's own id.
CREATE TABLE IF NOT EXISTS drone (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES school (id) ON DELETE CASCADE,
  local_id      text NOT NULL,
  name          text NOT NULL,
  number        integer,
  UNIQUE (school_id, local_id)
);

-- ---------------------------------------------------------------------------------------
-- The lesson
-- ---------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lesson (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES school (id) ON DELETE CASCADE,
  local_id      text NOT NULL,
  label         text NOT NULL,
  started_at    timestamptz NOT NULL,
  ended_at      timestamptz,
  fleet_size    integer NOT NULL DEFAULT 0,
  UNIQUE (school_id, local_id)
);

CREATE INDEX IF NOT EXISTS lesson_by_school_start ON lesson (school_id, started_at DESC);

-- A Mission is one run of a Mission Scenario inside a Lesson (ADR-0018). `outcome_score` is
-- the Teacher's sealed number, null until they seal it — never recomputed here.
CREATE TABLE IF NOT EXISTS mission (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      uuid NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
  scenario_id    text,
  scenario_name  text NOT NULL DEFAULT '',
  objective      text NOT NULL DEFAULT '',
  limit_minutes  integer,
  started_at     timestamptz,
  ended_at       timestamptz,
  outcome_score  numeric(4, 3),
  CONSTRAINT mission_score_is_a_fraction
    CHECK (outcome_score IS NULL OR (outcome_score >= 0 AND outcome_score <= 1))
);

CREATE INDEX IF NOT EXISTS mission_by_lesson ON mission (lesson_id);

-- The rules a Teacher read out, one per row. Ordered, because they are read aloud in order.
CREATE TABLE IF NOT EXISTS mission_rule (
  mission_id    uuid NOT NULL REFERENCES mission (id) ON DELETE CASCADE,
  ordinal       integer NOT NULL,
  text          text NOT NULL,
  PRIMARY KEY (mission_id, ordinal)
);

-- ---------------------------------------------------------------------------------------
-- The airspace
-- ---------------------------------------------------------------------------------------

-- Only no-go areas are drawn (ADR-0027), so `kind` has one legal value today and is a column
-- rather than an assumption, because ADR-0027 can be argued with and a schema should not have
-- to be migrated to hear the argument.
CREATE TABLE IF NOT EXISTS zone (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id    uuid NOT NULL REFERENCES mission (id) ON DELETE CASCADE,
  local_id      text NOT NULL,
  name          text NOT NULL,
  kind          text NOT NULL DEFAULT 'no-fly',
  CONSTRAINT zone_kind_is_known CHECK (kind IN ('no-fly')),
  UNIQUE (mission_id, local_id)
);

-- LOOKS AWKWARD, IS DELIBERATE.
--
-- A polygon is an ordered list of corners. Folded into `zone` as a JSON column it becomes a
-- repeating group, which is exactly what first normal form exists to refuse — and, worse, the
-- ordinal stops being a first-class thing. A No-fly Zone whose corners come back in a
-- different order is a different shape, and "the corners are stored as an array so they are
-- probably in order" is not a guarantee a safety boundary should rest on.
--
-- Metres east and north in the Fleet's own local frame, never a latitude (ADR-0019). These are
-- what a Teacher drew, not what an aircraft reported, so they are not a live reading.
CREATE TABLE IF NOT EXISTS zone_point (
  zone_id       uuid NOT NULL REFERENCES zone (id) ON DELETE CASCADE,
  ordinal       integer NOT NULL,
  east_m        numeric(8, 2) NOT NULL,
  north_m       numeric(8, 2) NOT NULL,
  PRIMARY KEY (zone_id, ordinal)
);

-- A point the Mission asks a child to reach. Also a Teacher's setting, not a reading.
CREATE TABLE IF NOT EXISTS checkpoint (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id    uuid NOT NULL REFERENCES mission (id) ON DELETE CASCADE,
  local_id      text NOT NULL,
  label         text NOT NULL DEFAULT '',
  east_m        numeric(8, 2) NOT NULL,
  north_m       numeric(8, 2) NOT NULL,
  required      boolean NOT NULL DEFAULT true,
  UNIQUE (mission_id, local_id)
);

-- ---------------------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS team (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     uuid NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
  local_id      text NOT NULL,
  name          text NOT NULL,
  drone_id      uuid REFERENCES drone (id) ON DELETE SET NULL,
  UNIQUE (lesson_id, local_id)
);

-- LOOKS AWKWARD, IS DELIBERATE.
--
-- A team has several children and a child can be moved between teams inside one lesson. Fold
-- the members into `team` as a list and you lose the ability to ask what a child did; fold the
-- team into `student` as a column and you lose the second team they were moved to, and you put
-- a lesson-shaped fact on a row that outlives the lesson. It is a many-to-many because it is
-- one.
CREATE TABLE IF NOT EXISTS team_member (
  team_id       uuid NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES student (id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, student_id)
);

-- ---------------------------------------------------------------------------------------
-- What a child did
-- ---------------------------------------------------------------------------------------

-- One child, in one lesson, on one craft. The row the Records screen is built from.
--
-- `present` is attendance, sealed when the Lesson closes. `flown_at` is the first sighting off
-- the ground, from Telemetry rather than a press — a fact about the past by the time it is
-- written here. `score` is the Teacher's sealed number.
CREATE TABLE IF NOT EXISTS seat (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     uuid NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES student (id) ON DELETE CASCADE,
  drone_id      uuid REFERENCES drone (id) ON DELETE SET NULL,
  present       boolean NOT NULL DEFAULT true,
  joined_at     timestamptz,
  flown_at      timestamptz,
  approved_at   timestamptz,
  landed_at     timestamptz,
  flight_seconds integer NOT NULL DEFAULT 0,
  score         numeric(4, 3),
  CONSTRAINT seat_score_is_a_fraction
    CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  CONSTRAINT seat_flight_seconds_not_negative CHECK (flight_seconds >= 0),
  UNIQUE (lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS seat_by_student ON seat (student_id);

-- LOOKS AWKWARD, IS DELIBERATE.
--
-- Which points a child reached is a **set with a time on each, in any order**. A child flying
-- by hand goes to whichever point is nearest, so an index on the seat calls out-of-order
-- flying a failure, and a count loses which ones — which is the whole question a Teacher asks
-- when a child says they got to the far one. `reached_at` is when Telemetry saw them there.
CREATE TABLE IF NOT EXISTS checkpoint_reached (
  seat_id       uuid NOT NULL REFERENCES seat (id) ON DELETE CASCADE,
  checkpoint_id uuid NOT NULL REFERENCES checkpoint (id) ON DELETE CASCADE,
  reached_at    timestamptz NOT NULL,
  PRIMARY KEY (seat_id, checkpoint_id)
);

-- A Teacher's own words about a child, kept between lessons. Not derived from anything.
CREATE TABLE IF NOT EXISTS student_note (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES student (id) ON DELETE CASCADE,
  lesson_id     uuid REFERENCES lesson (id) ON DELETE SET NULL,
  written_at    timestamptz NOT NULL DEFAULT now(),
  text          text NOT NULL
);

CREATE INDEX IF NOT EXISTS student_note_by_student ON student_note (student_id, written_at DESC);

-- Something that happened and was worth writing down: a fault, a Stop, a near miss. Attached
-- to the lesson, and to a craft when there was one.
CREATE TABLE IF NOT EXISTS lesson_incident (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     uuid NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
  drone_id      uuid REFERENCES drone (id) ON DELETE SET NULL,
  at            timestamptz NOT NULL,
  kind          text NOT NULL,
  detail        text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS lesson_incident_by_lesson ON lesson_incident (lesson_id, at);

-- Every Command that reached the Fleet. Five of them exist (ADR-0021) and all five are the
-- Teacher's, so this is a record of what a Teacher did rather than of what an aircraft was.
CREATE TABLE IF NOT EXISTS lesson_command (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     uuid NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
  drone_id      uuid REFERENCES drone (id) ON DELETE SET NULL,
  at            timestamptz NOT NULL,
  command       text NOT NULL,
  CONSTRAINT lesson_command_is_one_of_the_five
    CHECK (command IN ('land', 'hold', 'auto-land', 'emergency-stop', 'recall'))
);

CREATE INDEX IF NOT EXISTS lesson_command_by_lesson ON lesson_command (lesson_id, at);

COMMIT;
