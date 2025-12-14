const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TERMS_QUIZZES_TABLE = process.env.TERMS_QUIZZES_TABLE || 'terms_quizzes';

exports.handler = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const quizId = event.pathParameters?.quizId;
    const level = queryParams.level;
    const category = queryParams.category;

    let params;

    if (quizId) {
      // Get specific quiz by ID
      params = {
        TableName: TERMS_QUIZZES_TABLE,
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
    } else {
      // List quizzes with optional filters
      params = {
        TableName: TERMS_QUIZZES_TABLE,
      };

      if (level || category) {
        params.FilterExpression = [];
        params.ExpressionAttributeNames = {};
        params.ExpressionAttributeValues = {};

        if (level) {
          params.FilterExpression.push('#level = :level');
          params.ExpressionAttributeNames['#level'] = 'level';
          params.ExpressionAttributeValues[':level'] = level;
        }

        if (category) {
          params.FilterExpression.push('#category = :category');
          params.ExpressionAttributeNames['#category'] = 'category';
          params.ExpressionAttributeValues[':category'] = category;
        }

        params.FilterExpression = params.FilterExpression.join(' AND ');
      }

      const result = await dynamodb.scan(params).promise();

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizzes: result.Items || [],
          count: result.Count || 0,
        }),
      };
    }
  } catch (error) {
    console.error('Error fetching terms quiz:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to fetch terms quiz',
        message: error.message,
      }),
    };
  }
};


