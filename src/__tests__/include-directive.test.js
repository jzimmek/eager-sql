import {connectDb,runQuery} from "./helper"

const db = connectDb()

describe("scalar", () => {

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
        id: ID!
        name: String!
      }
      type Query {
        people: [Person]!
      }
    `,
    selects: {
      Query: {
        people(){
          return [`select * from test_people`]
        }
      }
    },
  }

  test("include true", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            name @include(if: true)
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "name": "name1"
        }
      ]
    })
  })

  test("include false", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            name @include(if: false)
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
        }
      ]
    })
  })
})
