import {connectDb,runQuery} from "./helper"

const db = connectDb()

describe("mutation", () => {

  const opts = {
    dbClean: `
      drop table if exists test_people;
    `,
    dbSchema: `
      create table test_people (
        id serial,
        name text not null,
        primary key (id)
      );

      insert into test_people (name) select 'name'||g from generate_series(1,1) g;
    `,
    graphqlSchema: `
      type Person {
        id: ID! @column
        name: String! @column
      }
      type Mutation {
        sayHello: Person
      }
      type Query {
        people: [Person]!
      }
    `,
    selects: {
      Mutation: {
        sayHello(){
          return [`select * from test_people limit 1`]
        }
      }
    },
    resolvers: {
      Mutation: {
        sayHello({sqlResolve}){
          return sqlResolve()
        }
      }
    },
  }

  test("list", async () => {
    const res = await runQuery(db, opts, {
      query: `
        mutation {
          sayHello {
            id
            __typename
            name
          }
        }
      `,
    })

    expect(res).toEqual({
      "sayHello": {
        "id": "1",
        "__typename": "Person",
        "name": "name1"
      }

    })

  })
})
