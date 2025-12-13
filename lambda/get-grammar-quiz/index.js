const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const GRAMMAR_QUIZZES_TABLE = process.env.GRAMMAR_QUIZZES_TABLE || 'grammar_quizzes';

exports.handler = async (event) => {
  try {
    const quizId = event.pathParameters?.quizId;

    if (!quizId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Quiz ID is required',
        }),
      };
    }

    const params = {
      TableName: GRAMMAR_QUIZZES_TABLE,
      Key: {
        quizId: quizId,
      },
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Quiz not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    console.error('Error fetching grammar quiz:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to fetch grammar quiz',
        message: error.message,
      }),
    };
  }
};


