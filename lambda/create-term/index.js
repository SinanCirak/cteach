const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const TERMS_TABLE = process.env.TERMS_TABLE || 'terms';

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
    if (!body.term) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Term is required' })
      };
    }

    // Generate term ID if not provided
    const termId = body.termId || uuidv4();
    
    const term = {
      termId,
      term: body.term.toLowerCase().trim(),
      definition: body.definition || '',
      example: body.example || '',
      partOfSpeech: body.partOfSpeech || 'noun', // noun, verb, adjective, adverb, etc.
      level: body.level || 'beginner', // beginner, intermediate, advanced
      category: body.category || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamodb.put({
      TableName: TERMS_TABLE,
      Item: term
    }).promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Term created successfully',
        term
      })
    };
  } catch (error) {
    console.error('Error creating term:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create term',
        message: error.message
      })
    };
  }
};


