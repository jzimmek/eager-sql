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
        id: ID! @column
        name: String! @column
        avatarUrl(size: String!): String!
      }
      type Query {
        people: [Person]!
      }
    `,
    selects: {
      Person: {
        avatarUrl({size}){
          return [`concat('avatar-',?::text)`, size]
        },
      },
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
            __typename
            name
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "__typename": "Person",
          "name": "name1"
        }
      ]
    })

  })

  test("field alias", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            xx: id
            __typename
            name
          }
        }
      `,
    })

    expect(res).toEqual({
      "people": [
        {
          "id": "1",
          "xx": "1",
          "__typename": "Person",
          "name": "name1"
        }
      ]
    })

  })

  test("field with args inline", async () => {
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


  test("field with args by variables", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query q ($size: String!) {
          people {
            id
            avatarUrl(size: $size)
          }
        }
      `,
      variables: {
        size: "big",
      },
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

  test("inline fragment", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
            ... on Person {
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
          "name": "name1"
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
          "name": "name1"
        }
      ]
    })

  })


  test("fragment spead", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
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
          "name": "name1"
        }
      ]
    })

  })

  test("nested fragment spead", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          people {
            id
          }
          ...WithPerson
        }
        fragment WithPerson on Query {
          people {
            name
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
})
