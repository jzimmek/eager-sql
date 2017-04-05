import React, {Component} from "react"
import {render} from "react-dom"
import sqlFormatter from "sql-formatter"


import GraphiQL from 'graphiql'
import "graphiql/graphiql.css"

import fetch from 'isomorphic-fetch'


const defaultQuery = `query q1 {
  person(id:"1") {
    id
    allFriends(first:2) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      edges {
        cursor
        node {
          id
          name
        }
      }
    }
	}
}
`

class DemoGraghiQl extends Component {
  constructor(props){
    super(props)
    this.state = {
      sql: null,
      sqlParams: null,
    }

    this.graphQLFetcher = this.graphQLFetcher.bind(this)
  }

  graphQLFetcher(graphQLParams) {
    return fetch(window.location.origin + '/graphql', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphQLParams),
    })
    .then(response => {
      let sql = response.headers.get("x-sql"),
          sqlParams = response.headers.get("x-sql-params")

      this.setState({
        sql: sql && decodeURIComponent(sql),
        sqlParams: sqlParams && decodeURIComponent(sqlParams),
      })
      return response
    })
    .then(response => response.json())
  }

  render(){
    let {sql,sqlParams} = this.state
    return <GraphiQL fetcher={this.graphQLFetcher} defaultQuery={defaultQuery}>
      <GraphiQL.Footer>
        <textarea value={sql ? (sqlFormatter.format(sql) + "\n\n" + sqlParams) : ""} readOnly/>
      </GraphiQL.Footer>
    </GraphiQL>
  }
}

render(<DemoGraghiQl/>, document.getElementById("app"))
