do $$
declare
  a_new_hope integer;
  the_empire_strikes_back integer;
  return_of_the_jedi integer;

  luke integer;
  yoda integer;
  darth_vader integer;
  r2_d2 integer;

  species_human integer;
  species_yoda integer;
  species_droid integer;
begin

  drop table if exists people cascade;
  drop table if exists films cascade;
  drop table if exists people_films cascade;
  drop table if exists species cascade;
  drop table if exists people_children cascade;

  create table species (
    id serial,
    name text not null,
    primary key (id)
  );

  create table people (
    id serial,
    name text not null,
    hair_color text not null,
    mass text not null,
    species_id integer not null references species(id),
    primary key (id)
  );

  create table people_children (
    id serial,
    parent_id integer not null references people(id),
    child_id integer not null references people(id),
    primary key (id),
    unique(parent_id, child_id)
  );

  create table films (
    id serial,
    name text not null,
    primary key (id)
  );

  create table people_films (
    id serial,
    people_id integer not null references people(id),
    film_id integer not null references films(id),
    primary key (id),
    unique(people_id,film_id)
  );

  insert into species (name) values ('Human') returning id into species_human;
  insert into species (name) values ('Yoda''s species') returning id into species_yoda;
  insert into species (name) values ('Droid') returning id into species_droid;

  insert into films (name) values ('A New Hope') returning id into a_new_hope;
  insert into films (name) values ('The Empire Strikes Back') returning id into the_empire_strikes_back;
  insert into films (name) values ('Return of the Jedi') returning id into return_of_the_jedi;

  insert into people (name,species_id,hair_color,mass) values ('Luke Skywalker', species_human, 'blond', '77') returning id into luke;
  insert into people (name,species_id,hair_color,mass) values ('Yoda', species_yoda, 'white', '17') returning id into yoda;
  insert into people (name,species_id,hair_color,mass) values ('Darth Vader', species_human, 'none', '136') returning id into darth_vader;
  insert into people (name,species_id,hair_color,mass) values ('R2-D2', species_droid, 'n/a', '32') returning id into r2_d2;

  insert into people_children (parent_id,child_id) values (darth_vader,luke);

  insert into people_films (people_id, film_id) values
    (luke,a_new_hope),
    (luke,the_empire_strikes_back),
    (luke,return_of_the_jedi),
    (darth_vader,a_new_hope),
    (darth_vader,the_empire_strikes_back),
    (darth_vader,return_of_the_jedi),
    (r2_d2,a_new_hope),
    (r2_d2,the_empire_strikes_back),
    (r2_d2,return_of_the_jedi),
    (yoda,the_empire_strikes_back),
    (yoda,return_of_the_jedi)
  ;


end
$$ language plpgsql;
