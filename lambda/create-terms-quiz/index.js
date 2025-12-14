const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const TERMS_QUIZZES_TABLE = process.env.TERMS_QUIZZES_TABLE || 'terms_quizzes';

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
    if (!body.title || !body.questions || !Array.isArray(body.questions)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'title and questions array are required' })
      };
    }

    // Generate quiz ID if not provided
    const quizId = body.quizId || uuidv4();
    
    // Validate questions
    for (const question of body.questions) {
      if (!question.type || !Array.isArray(question.options) || question.options.length < 2) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Each question must have a type and at least 2 options' })
        };
      }
      if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Each question must have a valid correctAnswer index' })
        };
      }
    }
    
    const quiz = {
      quizId,
      title: body.title,
      level: body.level || 'beginner',
      category: body.category || 'general',
      questions: body.questions.map((q, idx) => ({
        id: q.id || `q${idx + 1}`,
        type: q.type, // 'definition', 'term-selection', 'multiple-choice'
        term: q.term || '',
        definition: q.definition || '',
        options: q.options,
        correctAnswer: q.correctAnswer,
        example: q.example || '',
        explanation: q.explanation || ''
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamodb.put({
      TableName: TERMS_QUIZZES_TABLE,
      Item: quiz
    }).promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Terms quiz created successfully',
        quiz
      })
    };
  } catch (error) {
    console.error('Error creating terms quiz:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create terms quiz',
        message: error.message
      })
    };
  }
};


