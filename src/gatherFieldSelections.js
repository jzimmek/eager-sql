function gatherFieldSelections(ast, info, filterFragments){
  let fields = ast
    .selectionSet
    .selections
    .filter(e => e.kind === "Field")

  fields = ast
    .selectionSet
    .selections
    .filter(e => e.kind === "FragmentSpread")
    .map(e => info.fragments[e.name.value])
    .reduce((memo, fragment) => {
      return [
        ...memo,
        ...gatherFieldSelections(fragment, info, filterFragments),
      ]
    }, fields)

  fields = ast
    .selectionSet
    .selections
    .filter(e => e.kind === "InlineFragment")
    .filter(e => filterFragments.length === 0 || filterFragments.includes(e.typeCondition.name.value))
    .reduce((memo, fragment) => {
      return [
        ...memo,
        ...gatherFieldSelections(fragment, info, filterFragments),
      ]
    }, fields)

  return fields
}


export default gatherFieldSelections
