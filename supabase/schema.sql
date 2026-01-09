create table if not exists public.leagues (
  league_id bigint primary key,
  name text not null,
  slug text not null unique,
  start_date date,
  end_date date
);

create table if not exists public.teams (
  team_id bigint primary key,
  name text not null,
  slug text not null unique,
  logo_url text
);

create table if not exists public.patch (
  id bigserial primary key,
  patch text not null unique
);

create table if not exists public.matches (
  match_id bigint primary key,
  duration integer not null,
  start_time timestamp not null,
  dire_score integer not null,
  radiant_score integer not null,
  radiant_win boolean not null,
  series_type text,
  series_id bigint,
  radiant_team_id bigint,
  dire_team_id bigint,
  league_id bigint not null,
  first_tower_team_id bigint,
  first_tower_time integer,
  picks_bans jsonb,
  patch_id bigint not null,
  constraint matches_radiant_team_fk foreign key (radiant_team_id) references public.teams (team_id),
  constraint matches_dire_team_fk foreign key (dire_team_id) references public.teams (team_id),
  constraint matches_first_tower_fk foreign key (first_tower_team_id) references public.teams (team_id),
  constraint matches_league_fk foreign key (league_id) references public.leagues (league_id),
  constraint matches_patch_fk foreign key (patch_id) references public.patch (id)
);

create table if not exists public.heroes (
  id integer primary key,
  name text not null,
  localized_name text not null
);

create table if not exists public.players (
  id bigint primary key,
  name text not null
);

create table if not exists public.player_matches (
  id bigserial primary key,
  match_id bigint not null,
  player_slot integer not null,
  hero_id integer not null,
  account_id bigint,
  kills integer not null,
  deaths integer not null,
  assists integer not null,
  team_id bigint not null,
  gold_per_min numeric(8, 2) not null,
  xp_per_min numeric(8, 2) not null,
  last_hits integer not null,
  denies integer not null,
  item_0 integer,
  item_1 integer,
  item_2 integer,
  item_3 integer,
  item_4 integer,
  item_5 integer,
  item_neutral integer,
  gold integer,
  gold_spent integer,
  hero_damage integer,
  tower_damage integer,
  hero_healing integer,
  constraint player_matches_match_fk foreign key (match_id) references public.matches (match_id),
  constraint player_matches_team_fk foreign key (team_id) references public.teams (team_id),
  constraint player_matches_hero_fk foreign key (hero_id) references public.heroes (id)
);

create index if not exists leagues_start_date_idx on public.leagues (start_date);
create index if not exists matches_start_time_idx on public.matches (start_time);
create index if not exists matches_league_id_idx on public.matches (league_id);
create index if not exists matches_patch_id_idx on public.matches (patch_id);
create index if not exists player_matches_match_id_idx on public.player_matches (match_id);
create index if not exists player_matches_team_id_idx on public.player_matches (team_id);
create index if not exists player_matches_hero_id_idx on public.player_matches (hero_id);
