const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const GRAMMAR_LESSONS_TABLE = process.env.GRAMMAR_LESSONS_TABLE || 'grammar_lessons';

exports.handler = async (event) => {
  try {
    // Scan all grammar lessons
    const params = {
      TableName: GRAMMAR_LESSONS_TABLE,
    };

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
        lessons: result.Items || [],
        count: result.Count || 0,
      }),
    };
  } catch (error) {
    console.error('Error fetching grammar lessons:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to fetch grammar lessons',
        message: error.message,
      }),
    };
  }
};



