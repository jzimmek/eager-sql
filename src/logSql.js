export default (res) =>
  ({sql,params}) => {
    res.setHeader('x-sql', encodeURIComponent(sql))
    res.setHeader('x-sql-params', encodeURIComponent(JSON.stringify(params)))
  }
