const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE || 'categories';

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
    // GET - List all categories
    if (event.httpMethod === 'GET') {
      const params = {
        TableName: CATEGORIES_TABLE
      };
      
      const result = await dynamodb.scan(params).promise();
      const categories = result.Items || [];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ categories, count: categories.length })
      };
    }

    // POST - Create category
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      if (!body.name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name is required' })
        };
      }

      const categoryId = body.categoryId || uuidv4();
      const category = {
        categoryId,
        name: body.name,
        description: body.description || '',
        icon: body.icon || '📚',
        color: body.color || 'bg-blue-100',
        textColor: body.textColor || 'text-blue-700',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamodb.put({
        TableName: CATEGORIES_TABLE,
        Item: category
      }).promise();

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ message: 'Category created successfully', category })
      };
    }

    // PUT - Update category
    if (event.httpMethod === 'PUT') {
      const categoryId = event.pathParameters?.categoryId;
      if (!categoryId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Category ID is required' })
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
      if (body.icon) {
        updateExpression.push('#icon = :icon');
        expressionAttributeNames['#icon'] = 'icon';
        expressionAttributeValues[':icon'] = body.icon;
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
        TableName: CATEGORIES_TABLE,
        Key: { categoryId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const result = await dynamodb.update(params).promise();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Category updated successfully', category: result.Attributes })
      };
    }

    // DELETE - Delete category
    if (event.httpMethod === 'DELETE') {
      const categoryId = event.pathParameters?.categoryId;
      if (!categoryId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Category ID is required' })
        };
      }

      await dynamodb.delete({
        TableName: CATEGORIES_TABLE,
        Key: { categoryId }
      }).promise();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Category deleted successfully' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Error managing categories:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage category',
        message: error.message
      })
    };
  }
};


