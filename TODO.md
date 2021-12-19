# TODO

* Add ESLint, write rules for it, bring the code in line with the rules
* Explain all queries, add indexes:
  - Contract.ContractorId
  - Contract.ClientId
  - Job.paymentDate
* Reduce the set of attributes in queries
* Validate untrusted data on input (profile_id in headers)
* Split implementation into API facade and services (JobService etc), add jsdoc
* Negotiate contracts for API, don't disclose all data
* Support pagination in API (offset, limit, order, count)
* Write API documentation (OpenAPI for HTTP API)
* Consider using GraphQL for HTTP API
* Extend test suites, enable code coverage measurement
* Update insecure npm modules
* Support migrations
