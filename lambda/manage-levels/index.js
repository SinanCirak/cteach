const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const LEVELS_TABLE = process.env.LEVELS_TABLE || 'levels';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // GET - List all levels
    if (event.httpMethod === 'GET') {
      const params = {
        TableName: LEVELS_TABLE
      };
      
      const result = await dynamodb.scan(params).promise();
      const levels = result.Items || [];
      
      // Sort by order
      levels.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ levels, count: levels.length })
      };
    }

    // POST - Create level
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      if (!body.name || !body.order) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name and order are required' })
        };
      }

      const levelId = body.levelId || uuidv4();
      const level = {
        levelId,
        name: body.name,
        description: body.description || '',
        order: body.order,
        color: body.color || 'bg-gray-100',
        textColor: body.textColor || 'text-gray-700',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamodb.put({
        TableName: LEVELS_TABLE,
        Item: level
      }).promise();

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ message: 'Level created successfully', level })
      };
    }

    // PUT - Update level
    if (event.httpMethod === 'PUT') {
      const levelId = event.pathParameters?.levelId;
      if (!levelId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Level ID is required' })
        };
      }

      const body = JSON.parse(event.body || '{}');
      
      const updateExpression = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};

      if (body.name) {
        updateExpression.push('#name = :name');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = body.name;
      }
      if (body.description !== undefined) {
        updateExpression.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = body.description;
      }
      if (body.order !== undefined) {
        updateExpression.push('#order = :order');
        expressionAttributeNames['#order'] = 'order';
        expressionAttributeValues[':order'] = body.order;
      }
      if (body.color) {
        updateExpression.push('#color = :color');
        expressionAttributeNames['#color'] = 'color';
        expressionAttributeValues[':color'] = body.color;
      }
      if (body.textColor) {
        updateExpression.push('#textColor = :textColor');
        expressionAttributeNames['#textColor'] = 'textColor';
        expressionAttributeValues[':textColor'] = body.textColor;
      }

      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const params = {
        TableName: LEVELS_TABLE,
        Key: { levelId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await dynamodb.update(params).promise();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Level updated successfully', level: result.Attributes })
      };
    }

    // DELETE - Delete level
    if (event.httpMethod === 'DELETE') {
      const levelId = event.pathParameters?.levelId;
      if (!levelId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Level ID is required' })
        };
      }

      await dynamodb.delete({
        TableName: LEVELS_TABLE,
        Key: { levelId }
      }).promise();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Level deleted successfully' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Error managing levels:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage level',
        message: error.message
      })
    };
  }
};


