import toExecutableSqlAndParams from "../toExecutableSqlAndParams"

describe("toExecutableSqlAndParams", () => {

  test("static", () => {
    expect(toExecutableSqlAndParams(["select * from users"])).toEqual({
      sql: "select * from users",
      params: [],
    })
  })

  test("with placeholder", () => {
    expect(toExecutableSqlAndParams(["select * from users where id = ", {__param: 1}])).toEqual({
      sql: "select * from users where id = $1",
      params: [1],
    })

    expect(toExecutableSqlAndParams(["select * from users where id = ", {__param: 1}, " and id > ", {__param: 0}])).toEqual({
      sql: "select * from users where id = $1 and id > $2",
      params: [1, 0],
    })
  })

  test("nested", () => {
    expect(toExecutableSqlAndParams(["select * from users where (", "select true", ")"])).toEqual({
      sql: "select * from users where (select true)",
      params: [],
    })
  })

  test("nested with placeholder", () => {
    expect(toExecutableSqlAndParams(["select * from users where (", "select ", {__param: true}, ")"])).toEqual({
      sql: "select * from users where (select $1)",
      params: [true],
    })
  })

})
