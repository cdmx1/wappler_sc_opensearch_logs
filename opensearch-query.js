require('dotenv').config();
const { Client } = require('@opensearch-project/opensearch');

const opsUser = process.env.OPS_USERNAME;
const opsPass = process.env.OPS_PASSWORD;

exports.ops_query = async function (options) {
  const opensearchConfig = {
    node: this.parse(options.url) || 'http://localhost:9200',
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
                match: {
                  [this.parse(options.field)]: {
                    query: this.parse(options.query),
                  },
                },
              }
            : undefined,
          {
            range: {
              timestamp: {
                gte: this.parse(options.fromTimestamp),
                lte: this.parse(options.toTimestamp),
              },
            },
          },
        ].filter(Boolean), // Filter out undefined values
      },
    },
  };
  
  try {
    const initialResponse = await opensearchClient.search({
      index: indexName,
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