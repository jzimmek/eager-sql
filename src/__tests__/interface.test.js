import {connectDb,runQuery} from "./helper"

const db = connectDb()

describe("interface", () => {

  const opts = {
    dbClean: `
      drop table if exists test_dogs;
      drop table if exists test_cats;
      drop sequence if exists idx_seq;
    `,
    dbSchema: `
      create sequence idx_seq;

      create table test_dogs (
        id integer not null default nextval('idx_seq'),
        name text not null,
        primary key (id)
      );

      create table test_cats (
        id integer not null default nextval('idx_seq'),
        name text not null,
        primary key (id)
      );

      insert into test_dogs (name) select 'dog'||g from generate_series(1,1) g;
      insert into test_cats (name) select 'cat'||g from generate_series(2,2) g;
    `,
    graphqlSchema: `
      interface Pet {
        name: String!
      }
      type Cat implements Pet {
        id: ID!
        name: String!
      }
      type Dog implements Pet {
        id: ID!
        name: String!
      }
      type Query {
        pets: [Pet]!
      }
    `,
    resolvers: {
      Pet: {
        __resolveType(obj){
          return obj.type
        }
      },
    },
    selects: {
      Query: {
        pets(){
          return {
            wrapper: (inner) => [`select * from (`, inner, `) t order by t.to_json ->> 'id' asc`],
            types: {
              Cat: [`select * from test_cats`],
              Dog: [`select * from test_dogs`],
            }
          }
        }
      }
    },
  }

  test("list", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          pets {
            ... on Cat {
              id
            }
            ... on Dog {
              id
            }
            __typename
            name
          }
        }
      `,
    })

    expect(res).toEqual({
      "pets": [
        {
          "id": "1",
          "__typename": "Dog",
          "name": "dog1",
        },
        {
          "id": "2",
          "__typename": "Cat",
          "name": "cat2",
        }
      ]
    })

  })
})
