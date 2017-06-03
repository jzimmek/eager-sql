import {connectDb,runQuery} from "./helper"

const db = connectDb()

describe("union of interface", () => {
  const opts = {
    prefix: "union",
    dbClean: `
      drop table if exists test_people;
      drop table if exists test_events;
      drop sequence if exists idx_seq;
    `,
    dbSchema: `
      create sequence idx_seq;

      create table test_people (
        id integer not null default nextval('idx_seq'),
        name text not null,
        primary key (id)
      );

      create table test_events (
        id integer not null default nextval('idx_seq'),
        location text not null,
        primary key (id)
      );

      insert into test_people (name) select 'name'||g from generate_series(1,1) g;
      insert into test_events (location) select 'location'||g from generate_series(1,1) g;
    `,
    graphqlSchema: `
      interface Person {
        name: String!
      }
      type PersonImpl implements Person {
        id: ID!
        name: String!
      }
      type Event {
        id: ID!
        location: String!
      }
      union FeedItem = PersonImpl | Event
      type Query {
        feed: [FeedItem]!
        feedDesc: [FeedItem]!
        latestFeedItem: FeedItem
      }
    `,
    resolvers: {
      Person: {
        __resolveType(obj){
          return obj.type
        }
      },
      FeedItem: {
        __resolveType(obj){
          return obj.type
        }
      },
    },
    selects: {
      Query: {
        feed(){
          return {
            types: {
              PersonImpl: [`select * from test_people`],
              Event: [`select * from test_events`],
            }
          }
        },
        feedDesc(){
          return {
            wrapper: (inner) => [`select * from (`, inner,`) x order by to_json ->> 'id' desc`],
            types: {
              PersonImpl: [`select * from test_people`],
              Event: [`select * from test_events`],
            }
          }
        },
        latestFeedItem(){
          return {
            wrapper: (inner) => [`select * from (`, inner,`) x order by to_json ->> 'id' desc limit 1`],
            types: {
              PersonImpl: [`select * from test_people`],
              Event: [`select * from test_events`],
            }
          }
        }
      }
    },
  }


  test("inline fragment", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          feed {
            ... on Person {
              name
            }
            ... on PersonImpl {
              id
              __typename
            }
            ... on Event {
              id
              __typename
              location
            }
          }
        }
      `,
    })

    expect(res).toEqual({
      "feed": [
        {
          "id": "1",
          "__typename": "PersonImpl",
          "name": "name1"
        },
        {
          "id": "2",
          "__typename": "Event",
          "location": "location1"
        }
      ]
    })

  })


  test("nested inline fragment", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          feed {
            ... on PersonImpl {
              id
              __typename
              ... on Person {
                name
              }
            }
            ... on Event {
              ... on Event {
                id
                __typename
                location
              }
            }
          }
        }
      `,
    })

    expect(res).toEqual({
      "feed": [
        {
          "id": "1",
          "__typename": "PersonImpl",
          "name": "name1"
        },
        {
          "id": "2",
          "__typename": "Event",
          "location": "location1"
        }
      ]
    })

  })


  test("fragment spread", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          feed {
            ...WithPerson
            ...WithEvent
          }
        }

        fragment WithPerson on Person {
          ... on PersonImpl {
            id
            __typename
          }
          name
        }

        fragment WithEvent on Event {
          id
          __typename
          location
        }
      `,
    })

    expect(res).toEqual({
      "feed": [
        {
          "id": "1",
          "__typename": "PersonImpl",
          "name": "name1"
        },
        {
          "id": "2",
          "__typename": "Event",
          "location": "location1"
        }
      ]
    })

  })


  test("nested fragment spread", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          feed {
            ...WithPerson
            ...WithEvent
          }
        }

        fragment WithPerson on Person {
          ... on PersonImpl {
            id
            __typename
          }
          ...WithName
        }

        fragment WithName on Person {
          name
        }

        fragment WithEvent on Event {
          id
          __typename
          location
        }
      `,
    })

    expect(res).toEqual({
      "feed": [
        {
          "id": "1",
          "__typename": "PersonImpl",
          "name": "name1"
        },
        {
          "id": "2",
          "__typename": "Event",
          "location": "location1"
        }
      ]
    })
  })


  test("sorted", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          feedDesc {
            ... on Person {
              name
            }
            ... on PersonImpl {
              id
              __typename
            }
            ... on Event {
              id
              __typename
              location
            }
          }
        }
      `,
    })

    expect(res).toEqual({
      "feedDesc": [
        {
          "id": "2",
          "__typename": "Event",
          "location": "location1"
        },
        {
          "id": "1",
          "__typename": "PersonImpl",
          "name": "name1"
        },
      ]
    })
  })

  test("object result", async () => {
    const res = await runQuery(db, opts, {
      query: `
        query {
          latestFeedItem {
            ... on Person {
              name
            }
            ... on PersonImpl {
              id
              __typename
            }
            ... on Event {
              id
              __typename
              location
            }
          }
        }
      `,
    })

    expect(res).toEqual({
      "latestFeedItem": {
        "id": "2",
        "__typename": "Event",
        "location": "location1"
      }
    })
  })

})
