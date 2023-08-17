require("dotenv").config();
const { Client } = require('@opensearch-project/opensearch');

// const opsUrl = process.env.OPS_URL;
const opsUser = process.env.OPS_USERNAME;
const opsPass = process.env.OPS_PASSWORD;

exports.logger = async function (options) {
  const opensearchConfig = {
    node: this.parse(options.url) || "http://localhost:9200",
    auth: {
      username: opsUser,
      password: opsPass,
    },
    ssl: {
      rejectUnauthorized: options.ssl_check ? true : false,
    },
    headers: {
      'Content-Type': 'application/json', // Set the Content-Type header to application/json
    }
  };

  // Create an OpenSearch client
  const opensearchClient = new Client(opensearchConfig);
  const logObject = {
    ts: this.parse(options.timestamp),
    level: this.parse(options.log_level),
    e_event: this.parse(options.event),
    e_id: this.parse(options.id) ? this.parse(options.id) : "",
    e_type: this.parse(options.type),
    uid: this.parse(options.user_id),
    msg: this.parse(options.message),
    domain: this.parse(options.domain),
    sys: this.parse(options.system),
    aux: typeof this.parse(options.context) === 'object' ? this.parse(options.context) : { data: this.parse(options.context) },
  };
  // Send logs to OpenSearch
  opensearchClient.index({
    index: this.parse(options.index) || "nodejs-logs", // Index name to store logs
    body: logObject,
    refresh: this.parse(options.refresh) || false, // Optional: Set to true if you want the logs to be immediately searchable
  })
    .then(() => {
      console.log('Logs successfully sent to OpenSearch.');
    })
    .catch((error) => {
      console.error('Failed to send logs to OpenSearch:', error);
      return new Error('Failed to send logs to OpenSearch')
    });
};