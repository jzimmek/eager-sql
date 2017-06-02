import {sql} from "../index"

describe("sql helper", () => {
  test("static", () => {
    expect(sql`select * from users`).toEqual([`select * from users`])
  })

  test("with placeholder", () => {
    expect(sql`select * from users where id = ${1}`).toEqual([`select * from users where id = `, {__param: 1}])
    expect(sql`select * from users where name = ${"joe"}`).toEqual([`select * from users where name = `, {__param: "joe"}])
    expect(sql`select * from users where id = ${1} and id != ${2}`).toEqual([`select * from users where id = `, {__param: 1}, ` and id != `, {__param: 2}])
  })

  test("nested raw", () => {
    const nested = sql.raw("id")
    expect(sql`select * from users where ${nested} > 0`).toEqual([`select * from users where `, "id", ` > 0`])
  })

  test("nested sql as raw", () => {
    const nested = sql.raw(sql`select true`)
    expect(sql`select * from users where (${nested})`).toEqual([`select * from users where (`, "select true",`)`])
  })

  test("nested sql as raw with placeholder", () => {
    const nested = sql.raw(sql`(select ${true})`)
    expect(sql`select * from users where (${nested})`).toEqual([`select * from users where (`, `(select `, {__param: true}, ')' ,`)`])
  })

  test("outer placeholder and nested sql as raw with placeholder", () => {
    const nested = sql.raw(sql`select ${true}`)
    expect(sql`select * from users where id = ${1} and (${nested})`).toEqual([`select * from users where id = `, {__param: 1},` and (`, `select `, {__param: true},`)`])
  })

})
