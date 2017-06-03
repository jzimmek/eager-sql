import {connectDb,runQuery} from "./helper"
import {sql} from "../index"

const db = connectDb()

describe("custom scalar", () => {

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
      scalar Url
      type Person {
        id: ID!
        avatarUrl(size: String!): Url!
      }
      type Query {
        people: [Person]!
      }
    `,
    resolvers: {
      Url: {
        serialize(value){
          return value
        },
      }
    },
    selects: {
      Person: {
        avatarUrl({size}){
          return sql`concat('avatar-',cast(${size} as text))`
        },
      },
      Query: {
        people(){
          return sql`select * from test_people`
        }
      }
    }
  }

  test("simple field", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            avatarUrl(size: "big")
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "avatarUrl": "avatar-big"
        }
      ]
    })

  })
})
