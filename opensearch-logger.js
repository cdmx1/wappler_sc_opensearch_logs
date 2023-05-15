require("dotenv").config();
const { Client } = require('@opensearch-project/opensearch');

// const opsUrl = process.env.OPS_URL;
const opsUser = process.env.OPS_USERNAME;
const opsPass = process.env.OPS_PASSWORD;

exports.logger = async function (options) {
  const opensearchConfig = {
    node: options.url || "http://localhost:9200",
    auth: {
      username: opsUser,
      password: opsPass,
    },
    ssl: {
      rejectUnauthorized: options.ssl_check ? true:false,
    },
    headers: {
      'Content-Type': 'application/json', // Set the Content-Type header to application/json
    }
};

// Create an OpenSearch client
const opensearchClient = new Client(opensearchConfig);
// Example log object
const logObject = {
  message: options.message,
  log_level: options.log_level,
  details: typeof options.details === 'object' ? options.details : { message_details: options.details },
};
// Send logs to OpenSearch
opensearchClient.index({
  index: options.index || "nodejs-logs", // Index name to store logs
  body: logObject,
  refresh: true, // Optional: Set to true if you want the logs to be immediately searchable
})
  .then(() => {
    console.log('Logs successfully sent to OpenSearch.');
  })
  .catch((error) => {
    console.error('Failed to send logs to OpenSearch:', error);
    return new Error('Failed to send logs to OpenSearch')
  });
};