export default function(origResolve, obj, args, ctx, info){
  let ast = info.fieldNodes[0],
      key = ast.alias ? ast.alias.value : ast.name.value,
      res = obj[key]

  if(res === undefined)
    res = origResolve(obj, args, ctx, info)

  return res
}
