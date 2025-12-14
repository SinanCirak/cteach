const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const VOCABULARY_WORDS_TABLE = process.env.VOCABULARY_WORDS_TABLE || 'vocabulary_words';

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
    if (!body.word) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Word is required' })
      };
    }

    // Generate word ID if not provided
    const wordId = body.wordId || uuidv4();
    
    const word = {
      wordId,
      word: body.word.toLowerCase().trim(),
      definition: body.definition || '',
      example: body.example || '',
      partOfSpeech: body.partOfSpeech || 'noun', // noun, verb, adjective, adverb, etc.
      level: body.level || 'beginner', // beginner, intermediate, advanced
      category: body.category || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamodb.put({
      TableName: VOCABULARY_WORDS_TABLE,
      Item: word
    }).promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Vocabulary word created successfully',
        word
      })
    };
  } catch (error) {
    console.error('Error creating vocabulary word:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create vocabulary word',
        message: error.message
      })
    };
  }
};


