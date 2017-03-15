begin;

create extension if not exists "pgcrypto";

drop table if exists friends;
drop table if exists people;

create table people (
  id serial,
  name text not null,
  primary key (id)
);

create table friends (
  id serial,
  person_id integer not null references people(id),
  friend_id integer not null references people(id),
  primary key (id)
);

create index idx_people on people(id);
create index idx_friends on friends(person_id);

insert into people (name) select 'name'||g from generate_series(1,100) g;

insert into friends (person_id, friend_id) select id, ceil(random() * 100) from people;
insert into friends (person_id, friend_id) select id, ceil(random() * 100) from people;
insert into friends (person_id, friend_id) select id, ceil(random() * 100) from people;
insert into friends (person_id, friend_id) select id, ceil(random() * 100) from people;
insert into friends (person_id, friend_id) select id, ceil(random() * 100) from people;

delete from friends where person_id = friend_id;

commit;
