import {connectDb,runQuery} from "./helper"

const db = connectDb()

describe("has one", () => {

  const opts = {
    dbClean: `
      drop table if exists test_people;
    `,
    dbSchema: `
      create table test_people (
        id serial,
        name text not null,
        best_friend_id integer references test_people(id),
        primary key (id)
      );

      insert into test_people (name, best_friend_id) select 'name'||g, (case when g = 1 then null else g - 1 end) from generate_series(1,3) g;
    `,
    graphqlSchema: `
      type Person {
        id: ID!
        name: String!
        bestFriend: Person
      }
      type Query {
        people: [Person]!
      }
    `,
    selects: {
      Person: {
        bestFriend(_args, {table}){
          return [`select p.* from test_people p where p.id = ${table}.best_friend_id`]
        }
      },
      Query: {
        people(){
          return [`select * from test_people order by id`]
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
            bestFriend {
              id
              name
            }
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "bestFriend": null
        },
        {
          "id": "2",
          "bestFriend": {
            "id": "1",
            "name": "name1"
          }
        },
        {
          "id": "3",
          "bestFriend": {
            "id": "2",
            "name": "name2"
          }
        }
      ]
    })

  })


  test("inline fragment", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            ... on Person {
              bestFriend {
                id
                name
              }
            }
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "bestFriend": null
        },
        {
          "id": "2",
          "bestFriend": {
            "id": "1",
            "name": "name1"
          }
        },
        {
          "id": "3",
          "bestFriend": {
            "id": "2",
            "name": "name2"
          }
        }
      ]
    })

  })






  test("nested inline fragment", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
          }
          ... on Query {
            people {
              ... on Person {
                bestFriend {
                  id
                  name
                }
              }
            }
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "bestFriend": null
        },
        {
          "id": "2",
          "bestFriend": {
            "id": "1",
            "name": "name1"
          }
        },
        {
          "id": "3",
          "bestFriend": {
            "id": "2",
            "name": "name2"
          }
        }
      ]
    })

  })



  test("fragment spread", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            ...WithBestFriend
          }
        }

        fragment WithBestFriend on Person {
          bestFriend {
            id
            name
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "bestFriend": null
        },
        {
          "id": "2",
          "bestFriend": {
            "id": "1",
            "name": "name1"
          }
        },
        {
          "id": "3",
          "bestFriend": {
            "id": "2",
            "name": "name2"
          }
        }
      ]
    })

  })


  test("multiple fragment spread", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            ...WithBestFriendId
            ...WithBestFriendName
          }
        }

        fragment WithBestFriendId on Person {
          bestFriend {
            id
          }
        }

        fragment WithBestFriendName on Person {
          bestFriend {
            name
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "bestFriend": null
        },
        {
          "id": "2",
          "bestFriend": {
            "id": "1",
            "name": "name1"
          }
        },
        {
          "id": "3",
          "bestFriend": {
            "id": "2",
            "name": "name2"
          }
        }
      ]
    })

  })


  test("nested fragment spread", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            ...WithBestFriend
          }
        }

        fragment WithBestFriend on Person {
          bestFriend {
            id
            ...WithName
          }
        }

        fragment WithName on Person {
          name
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "bestFriend": null
        },
        {
          "id": "2",
          "bestFriend": {
            "id": "1",
            "name": "name1"
          }
        },
        {
          "id": "3",
          "bestFriend": {
            "id": "2",
            "name": "name2"
          }
        }
      ]
    })

  })
})
