import {connectDb,runQuery} from "./helper"
import {cursor,sql} from "../index"

const db = connectDb()

describe("relay-cursor", () => {

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

      insert into test_people (name) select 'name'||g from generate_series(1,10) g;
    `,
    graphqlSchema: `
      type Person {
        id: ID!
        name: String!
      }

      type PersonConnection {
        edges: [PersonEdge]!
        pageInfo: PageInfo!
      }

      type PersonEdge {
        cursor: String!
        node: Person!
      }

      type PageInfo {
        hasNextPage: Boolean!
        hasPreviousPage: Boolean!
      }

      input PersonConnectionInput {
        first: Int
        last: Int
        after: String
        before: String
      }

      type Query {
        people(input: PersonConnectionInput!): PersonConnection!
      }
    `,
    selects: {
      Query: {
        people(args){
          return cursor(args.input, ([before], [after]) => {
            return sql`
              select
                p.*,
                row_number() over (order by p.id asc) as "$row_number",
                json_build_array(p.id) as "$cursor"
              from test_people p
              where
                coalesce(p.id > cast(${after} as integer), true)
                and coalesce(p.id < cast(${before} as integer), true)
            `
          })
        }
      }
    },
  }

  test("first 3", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query q ($input: PersonConnectionInput!) {
          people(input: $input) {
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }
      `,
      variables: {
        input: {
          first: 3
        }
      }
    })

    expect(res).toEqual({
      "people": {
        edges: [
          {
            cursor: "WzFd",
            node: {
              "id": "1",
              "name": "name1"
            }
          },
          {
            cursor: "WzJd",
            node: {
              "id": "2",
              "name": "name2"
            }
          },
          {
            cursor: "WzNd",
            node: {
              "id": "3",
              "name": "name3"
            }
          }
        ]
      }
    })

  })

  test("first 3 after 3.", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query q ($input: PersonConnectionInput!) {
          people(input: $input) {
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }
      `,
      variables: {
        input: {
          first: 3,
          after: "WzNd",
        }
      }
    })

    expect(res).toEqual({
      "people": {
        edges: [
          {
            cursor: "WzRd",
            node: {
              "id": "4",
              "name": "name4"
            }
          },
          {
            cursor: "WzVd",
            node: {
              "id": "5",
              "name": "name5"
            }
          },
          {
            cursor: "WzZd",
            node: {
              "id": "6",
              "name": "name6"
            }
          }
        ]
      }
    })

  })

  test("last 3", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query q ($input: PersonConnectionInput!) {
          people(input: $input) {
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }
      `,
      variables: {
        input: {
          last: 3
        }
      }
    })

    expect(res).toEqual({
      "people": {
        edges: [
          {
            cursor: "Wzhd",
            node: {
              "id": "8",
              "name": "name8"
            }
          },
          {
            cursor: "Wzld",
            node: {
              "id": "9",
              "name": "name9"
            }
          },
          {
            cursor: "WzEwXQ==",
            node: {
              "id": "10",
              "name": "name10"
            }
          }
        ]
      }
    })

  })

})
