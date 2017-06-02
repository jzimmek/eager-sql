export const SPLIT = "@@"

const merge = (a={}, b={}) => {

  const mergeArr = (arrA, arrB) => {
    let res = [...arrA]

    arrB.forEach(b => {
      const idx = res.findIndex(a => `${a.id}${a.type}` === `${b.id}${b.type}`)
      if(idx === -1){
        res = [...res, b]
      }else{
        res[idx] = merge(res[idx], b)
      }
    })

    return res
  }

  const res = Object.keys(a).reduce((memo, key) => {
    return {
      ...memo,
      [key.split(SPLIT)[0]]: a[key]
    }
  }, {})

  Object.keys(b).forEach(key => {
    if(b[key] !== undefined){

      const mergeKey = key.split(SPLIT)[0]

      if(typeof(b[key]) === "object"){
        if(Array.isArray(b[key])){
          res[mergeKey] = res[mergeKey] ? mergeArr(res[mergeKey], b[key]) : [...b[key]]
        }else{
          res[mergeKey] = res[mergeKey] ? merge(res[mergeKey], b[key]) : {...b[key]}

          // no {} empty objects
          if(Object.keys(res[mergeKey]).length === 0)
            res[mergeKey] = null
        }
      }else{
        res[mergeKey] = b[key]
      }
    }
  })

  return Object.keys(res).length > 0 ? res : null
}

export default merge
