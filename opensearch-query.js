require('dotenv').config();
const { Client } = require('@opensearch-project/opensearch');

const opsUser = process.env.OPS_USERNAME;
const opsPass = process.env.OPS_PASSWORD;
const opsUrl = process.env.OPS_URL;

exports.ops_query = async function (options) {
  const timestampField = this.parse(options.timestampField) || '@timestamp';
  const sortField = this.parse(options.sort_field);
  const sortOrder = this.parse(options.sort_order) || 'desc';
  const opensearchConfig = {
    node: opsUrl,
    auth: {
      username: opsUser,
      password: opsPass,
    },
    ssl: {
      rejectUnauthorized: options.ssl_check ? true : false,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const opensearchClient = new Client(opensearchConfig);
  const indexName = this.parse(options.index);

  const body = {
    query: {
      bool: {
        must: [
          // Remove the match part if options.field or options.query is missing
          options.field && options.query
            ? {
                match_phrase: {
                  [this.parse(options.field)]: this.parse(options.query),
                },
              }
            : undefined,
          options.fromTimestamp && options.toTimestamp
            ? {
                range: {
                  [timestampField]: {
                    gte: this.parse(options.fromTimestamp),
                    lte: this.parse(options.toTimestamp),
                  },
                },
              }
            : undefined,
            options.is_note ? 
            {
              term: {
                is_note: this.parse(options.is_note),
              },
            }
            : undefined,
        ].filter(Boolean), 
      },
    },
    sort: sortField // Include sorting outside the query
      ? [{ [sortField]: sortOrder }]
      : undefined,
  };
  
  try {
    const initialResponse = await opensearchClient.search({
      index: indexName,
      ...(options.output_fields
        ? { _source: this.parse(options.output_fields).split(',') }
        : {}),
      scroll: '1m', // Set the scroll time
      size: 1000, // Set an initial batch size
      body: body,
    });
    let hits = initialResponse.body.hits.hits.map(hit => hit._source);
    let scrollId = initialResponse.body._scroll_id;
  
    while (hits.length < initialResponse.body.hits.total.value) {
      const scrollResponse = await opensearchClient.scroll({
        scrollId: scrollId,
        scroll: '1m', // Set the same scroll time as the initial request
      });
  
      hits = hits.concat(scrollResponse.body.hits.hits.map(hit => hit._source));
      scrollId = scrollResponse.body._scroll_id;
    }
  
    await opensearchClient.clearScroll({
      body: {
        scroll_id: scrollId,
      },
    });
  
    return hits;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
}