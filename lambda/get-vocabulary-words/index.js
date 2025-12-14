const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const VOCABULARY_WORDS_TABLE = process.env.VOCABULARY_WORDS_TABLE || 'vocabulary_words';

exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const word = queryParams.word;
    const level = queryParams.level;

    let params;

    if (word) {
      // Search by word using GSI
      params = {
        TableName: VOCABULARY_WORDS_TABLE,
        IndexName: 'word-index',
        KeyConditionExpression: '#word = :word',
        ExpressionAttributeNames: {
          '#word': 'word',
        },
        ExpressionAttributeValues: {
          ':word': word.toLowerCase(),
        },
      };
    } else if (level) {
      // Filter by level
      params = {
        TableName: VOCABULARY_WORDS_TABLE,
        FilterExpression: '#level = :level',
        ExpressionAttributeNames: {
          '#level': 'level',
        },
        ExpressionAttributeValues: {
          ':level': level,
        },
      };
    } else {
      // Get all words
      params = {
        TableName: VOCABULARY_WORDS_TABLE,
      };
    }

    const result = word
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
        words: result.Items || [],
        count: result.Count || 0,
      }),
    };
  } catch (error) {
    console.error('Error fetching vocabulary words:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to fetch vocabulary words',
        message: error.message,
      }),
    };
  }
};



