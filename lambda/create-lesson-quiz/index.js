const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const GRAMMAR_QUIZZES_TABLE = process.env.GRAMMAR_QUIZZES_TABLE || 'grammar_quizzes';

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
    if (!body.lessonId || !body.title || !body.questions || !Array.isArray(body.questions)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'lessonId, title, and questions array are required' })
      };
    }

    // Generate quiz ID if not provided
    const quizId = body.quizId || uuidv4();
    
    // Validate questions
    for (const question of body.questions) {
      if (!question.question || !Array.isArray(question.options) || question.options.length < 2) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Each question must have a question text and at least 2 options' })
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
      lessonId: body.lessonId,
      title: body.title,
      questions: body.questions.map((q, idx) => ({
        id: q.id || `q${idx + 1}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || ''
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamodb.put({
      TableName: GRAMMAR_QUIZZES_TABLE,
      Item: quiz
    }).promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Lesson quiz created successfully',
        quiz
      })
    };
  } catch (error) {
    console.error('Error creating lesson quiz:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create lesson quiz',
        message: error.message
      })
    };
  }
};


