import {connectDb,runQuery} from "./helper"
import {sql} from "../index"

const db = connectDb()

describe("leaf", () => {

  const opts = {
    dbClean: `
      drop table if exists test_people;
    `,
    dbSchema: `
      create table test_people (
        id serial,
        name text not null,
        role text not null check(role in ('USER','ADMIN')),
        primary key (id)
      );

      insert into test_people (name,role) select 'name'||g, (case when g % 2 = 0 then 'USER' else 'ADMIN' end) from generate_series(1,2) g;
    `,
    graphqlSchema: `
      enum Role {
        USER
        ADMIN
      }
      type Person {
        id: ID!
        role: Role!
      }
      type Query {
        people: [Person]!
      }
    `,
    selects: {
      Query: {
        people(){
          return sql`select * from test_people`
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
            role
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "role": "ADMIN"
        },
        {
          "id": "2",
          "role": "USER"
        }
      ]
    })
  })
})
