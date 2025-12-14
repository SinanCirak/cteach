const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const APP_CONFIG_TABLE = process.env.APP_CONFIG_TABLE || 'app_config';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // GET - Get app configuration
    if (event.httpMethod === 'GET') {
      const params = {
        TableName: APP_CONFIG_TABLE,
        Key: { configKey: 'main' }
      };
      
      const result = await dynamodb.get(params).promise();
      
      // Default configuration if not exists
      const defaultConfig = {
        features: {
          lessons: true,
          terms: false,
          quizzes: true
        },
        termsType: 'formulas', // 'formulas' or 'memorizing'
        updatedAt: new Date().toISOString()
      };
      
      const config = result.Item?.config || defaultConfig;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ config })
      };
    }

    // POST/PUT - Update app configuration
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      
      const config = {
        configKey: 'main',
        config: {
          features: {
            lessons: body.features?.lessons !== undefined ? body.features.lessons : true,
            terms: body.features?.terms !== undefined ? body.features.terms : false,
            quizzes: body.features?.quizzes !== undefined ? body.features.quizzes : true
          },
          termsType: body.termsType || 'formulas',
          updatedAt: new Date().toISOString()
        }
      };

      await dynamodb.put({
        TableName: APP_CONFIG_TABLE,
        Item: config
      }).promise();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Configuration updated successfully', config: config.config })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Error managing app config:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage app configuration',
        message: error.message
      })
    };
  }
};

