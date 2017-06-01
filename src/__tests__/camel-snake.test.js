import {connectDb,runQuery} from "./helper"

const db = connectDb()

describe("camel snake", () => {

  const opts = {
    dbClean: `
      drop table if exists test_people;
    `,
    dbSchema: `
      create table test_people (
        id serial,
        full_name text not null,
        primary key (id)
      );

      insert into test_people (full_name) select 'name'||g from generate_series(1,1) g;
    `,
    graphqlSchema: `
      type Person {
        id: ID!
        fullName: String!
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

  test("simple field", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            fullName
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "fullName": "name1"
        }
      ]
    })

  })
})
