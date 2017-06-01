import {sql} from "../index"

describe("sql helper", () => {
  test("static", () => {
    expect(sql`select * from users`).toEqual([`select * from users`])
  })

  test("with placeholder", () => {
    expect(sql`select * from users where id = ${1}`).toEqual([`select * from users where id = ?`, 1])
    expect(sql`select * from users where id = ${1} and id != ${2}`).toEqual([`select * from users where id = ? and id != ?`, 1, 2])
  })

  test("nested raw", () => {
    expect(sql`select * from users where ${sql.raw("id")} > 0`).toEqual([`select * from users where id > 0`])
  })

  test("nested sql as raw", () => {
    expect(sql`select * from users where (${sql.raw(sql`select true`)})`).toEqual([`select * from users where (select true)`])
  })

  test("nested sql as raw with placeholder", () => {
    expect(sql`select * from users where (${sql.raw(sql`select ${true}`)})`).toEqual([`select * from users where (select ?)`, true])
  })

  test("outer placeholder and nested sql as raw with placeholder", () => {
    expect(sql`select * from users where id = ${1} and (${sql.raw(sql`select ${true}`)})`).toEqual([`select * from users where id = ? and (select ?)`, 1, true])
  })
})
