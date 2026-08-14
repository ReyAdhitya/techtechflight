-- TechTech Flight records, on Neon Postgres.
--
-- ADR-0034: the browser is the record and this is the copy. Nothing a Teacher does in a lesson
-- waits on this database; every screen writes localStorage first and succeeds with the wifi
-- off. This exists so the same records open on another machine and survive a lost laptop.
--
-- **No live readings.** No altitude, no battery, no position, ever. Coordinates appear on
-- zone_point and checkpoint because those are what a Teacher *set*, not what an airframe
-- reported. That is the same line the product already draws between the board and the records,
-- and it is the one rule in here worth refusing a pull request over.
--
-- Third normal form. Written as set out in
-- docs/plans/2026-08-12-the-store-the-database-and-large-format.md; the three tables that look
-- like over-normalisation are deliberate and the reason is above each.

begin;

create table if not exists school      (id uuid primary key default gen_random_uuid(),
                                        name text not null);

create table if not exists teacher     (id uuid primary key default gen_random_uuid(),
                                        school_id uuid not null references school(id) on delete cascade,
                                        name text not null);

create table if not exists class_group (id uuid primary key default gen_random_uuid(),
                                        school_id uuid not null references school(id) on delete cascade,
                                        name text not null);

-- A child belongs to a class, and a class belongs to a school. Deletion runs down this chain,
-- which is what makes "delete everything about this school" one statement rather than a hunt.
create table if not exists student     (id uuid primary key default gen_random_uuid(),
                                        class_id uuid not null references class_group(id) on delete cascade,
                                        name text not null);

create table if not exists drone       (id uuid primary key default gen_random_uuid(),
                                        school_id uuid not null references school(id) on delete cascade,
                                        label text not null,
                                        serial text,
                                        unique (school_id, label));

create table if not exists scenario    (id uuid primary key default gen_random_uuid(),
                                        name text not null,
                                        objective text not null,
                                        limit_minutes int not null);

create table if not exists criterion   (id uuid primary key default gen_random_uuid(),
                                        scenario_id uuid not null references scenario(id) on delete cascade,
                                        text text not null);

create table if not exists lesson      (id uuid primary key default gen_random_uuid(),
                                        class_id uuid not null references class_group(id) on delete cascade,
                                        teacher_id uuid not null references teacher(id),
                                        label text not null,
                                        started_at timestamptz not null,
                                        ended_at timestamptz);

create table if not exists mission     (id uuid primary key default gen_random_uuid(),
                                        lesson_id uuid not null references lesson(id) on delete cascade,
                                        scenario_id uuid not null references scenario(id),
                                        started_at timestamptz not null,
                                        sealed_at timestamptz);

create table if not exists team        (id uuid primary key default gen_random_uuid(),
                                        mission_id uuid not null references mission(id) on delete cascade,
                                        name text not null);

-- LOOKS AWKWARD, IS DELIBERATE.
-- A team holds several students and a student joins several teams across a year. Neither side
-- can hold the other, so it is a table of its own.
create table if not exists team_member (team_id uuid not null references team(id) on delete cascade,
                                        student_id uuid not null references student(id) on delete cascade,
                                        primary key (team_id, student_id));

create table if not exists zone        (id uuid primary key default gen_random_uuid(),
                                        mission_id uuid not null references mission(id) on delete cascade,
                                        kind text not null,
                                        name text not null);

-- LOOKS AWKWARD, IS DELIBERATE.
-- A zone has many corners. Storing them as corner1, corner2, corner3 breaks the moment somebody
-- draws four, and that is the classic third-normal-form mistake. The ordinal has to be a column
-- because a No-fly Zone whose corners come back in a different order is a different shape.
-- Metres east and north in the Fleet's own frame, never a latitude (ADR-0019).
create table if not exists zone_point  (id uuid primary key default gen_random_uuid(),
                                        zone_id uuid not null references zone(id) on delete cascade,
                                        ordinal int not null,
                                        east_m numeric not null,
                                        north_m numeric not null,
                                        unique (zone_id, ordinal));

create table if not exists checkpoint  (id uuid primary key default gen_random_uuid(),
                                        mission_id uuid not null references mission(id) on delete cascade,
                                        ordinal int not null,
                                        east_m numeric not null,
                                        north_m numeric not null,
                                        unique (mission_id, ordinal));

create table if not exists flight      (id uuid primary key default gen_random_uuid(),
                                        mission_id uuid not null references mission(id) on delete cascade,
                                        team_id uuid not null references team(id),
                                        drone_id uuid not null references drone(id),
                                        took_off_at timestamptz,
                                        landed_at timestamptz);

-- LOOKS AWKWARD, IS DELIBERATE.
-- It records *when*. Storing "3 of 5" on the flight throws away which three, and which three is
-- the question a Teacher asks when a child says they got to the far one. A child flying by hand
-- goes to whichever point is nearest, so there is no order to infer either.
create table if not exists checkpoint_reached (flight_id uuid not null references flight(id) on delete cascade,
                                        checkpoint_id uuid not null references checkpoint(id) on delete cascade,
                                        reached_at timestamptz not null,
                                        primary key (flight_id, checkpoint_id));

create table if not exists incident    (id uuid primary key default gen_random_uuid(),
                                        flight_id uuid not null references flight(id) on delete cascade,
                                        kind text not null,
                                        happened_at timestamptz not null,
                                        note text);

-- Hangs off flight, not mission, so two teams flying the same Mission score differently. That
-- is the point of scoring.
create table if not exists criterion_result (flight_id uuid not null references flight(id) on delete cascade,
                                        criterion_id uuid not null references criterion(id) on delete cascade,
                                        met boolean not null,
                                        primary key (flight_id, criterion_id));

create index if not exists lesson_by_class on lesson (class_id, started_at desc);
create index if not exists flight_by_mission on flight (mission_id);
create index if not exists flight_by_team on flight (team_id);
create index if not exists incident_by_flight on incident (flight_id, happened_at);

commit;
