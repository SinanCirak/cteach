const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TERMS_TABLE = process.env.TERMS_TABLE || 'terms';

exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const term = queryParams.term;
    const level = queryParams.level;

    let params;

    if (term) {
      // Search by term using GSI
      params = {
        TableName: TERMS_TABLE,
        IndexName: 'term-index',
        KeyConditionExpression: '#term = :term',
        ExpressionAttributeNames: {
          '#term': 'term',
        },
        ExpressionAttributeValues: {
          ':term': term.toLowerCase(),
        },
      };
    } else if (level) {
      // Filter by level
      params = {
        TableName: TERMS_TABLE,
        FilterExpression: '#level = :level',
        ExpressionAttributeNames: {
          '#level': 'level',
        },
        ExpressionAttributeValues: {
          ':level': level,
        },
      };
    } else {
      // Get all terms
      params = {
        TableName: TERMS_TABLE,
      };
    }

    const result = term
      ? await dynamodb.query(params).promise()
      : await dynamodb.scan(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        terms: result.Items || [],
        count: result.Count || 0,
      }),
    };
  } catch (error) {
    console.error('Error fetching terms:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to fetch terms',
        message: error.message,
      }),
    };
  }
};



