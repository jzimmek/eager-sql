import merge from "../merge"

test("merge object; non-overlapping", () => {
  expect(merge({a:1}, {b:2})).toEqual({a:1,b:2})
})

test("merge object; overlapping", () => {
  expect(merge({a:1}, {a:2})).toEqual({a:2})
})

test("merge object; over- and non-overlapping", () => {
  expect(merge({a:1,b:2}, {a:2})).toEqual({a:2,b:2})
})

test("merge array", () => {
  expect(merge({arr: []}, {arr: [{id:1}]})).toEqual({arr: [{id: 1}]})
})

test("merge array; different id", () => {
  expect(merge({arr: [{id: 2}]}, {arr: [{id:1}]})).toEqual({arr: [{id: 2}, {id: 1}]})
})

test("merge array; same id", () => {
  expect(merge({arr: [{id: 1, val: "a"}]}, {arr: [{id:1, val: "b"}]})).toEqual({arr: [{id: 1, val: "b"}]})
})

test("merge array; same id but different type", () => {
  expect(merge({arr: [{id: 1, type: "x", val: "a"}]}, {arr: [{id:1, type: "y", val: "b"}]})).toEqual({arr: [{id: 1, type: "x", val: "a"}, {id: 1, type: "y", val: "b"}]})
})

test("merge array; same id same type", () => {
  expect(merge({arr: [{id: 1, type: "x", val: "a"}]}, {arr: [{id:1, type: "x", val: "b"}]})).toEqual({arr: [{id: 1, type: "x", val: "b"}]})
})
