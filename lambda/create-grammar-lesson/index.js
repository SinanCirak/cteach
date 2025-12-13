const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const GRAMMAR_LESSONS_TABLE = process.env.GRAMMAR_LESSONS_TABLE || 'grammar_lessons';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    const body = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!body.title || !body.content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title and content are required' })
      };
    }

    // Generate lesson ID if not provided
    const lessonId = body.lessonId || uuidv4();
    
    const lesson = {
      lessonId,
      title: body.title,
      subtitle: body.subtitle || '',
      content: Array.isArray(body.content) ? body.content : [body.content],
      formula: body.formula || '',
      uses: body.uses || [],
      examples: body.examples || [],
      tips: body.tips || [],
      level: body.level || 'beginner',
      order: body.order || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamodb.put({
      TableName: GRAMMAR_LESSONS_TABLE,
      Item: lesson
    }).promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Grammar lesson created successfully',
        lesson
      })
    };
  } catch (error) {
    console.error('Error creating grammar lesson:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create grammar lesson',
        message: error.message
      })
    };
  }
};

