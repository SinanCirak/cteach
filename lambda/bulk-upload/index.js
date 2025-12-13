const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

const GRAMMAR_LESSONS_TABLE = process.env.GRAMMAR_LESSONS_TABLE || 'grammar_lessons';
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
    const { type, items } = body;
    
    if (!type || !items || !Array.isArray(items)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Type and items array are required' })
      };
    }

    const results = {
      success: [],
      errors: []
    };

    if (type === 'grammar_lessons') {
      for (const item of items) {
        try {
          const lessonId = item.lessonId || uuidv4();
          const lesson = {
            lessonId,
            title: item.title,
            subtitle: item.subtitle || '',
            content: Array.isArray(item.content) ? item.content : [item.content || ''],
            formula: item.formula || '',
            uses: item.uses || [],
            examples: item.examples || [],
            tips: item.tips || [],
            level: item.level || 'beginner',
            order: item.order || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await dynamodb.put({
            TableName: GRAMMAR_LESSONS_TABLE,
            Item: lesson
          }).promise();

          results.success.push({ lessonId, title: lesson.title });
        } catch (error) {
          results.errors.push({ item, error: error.message });
        }
      }
    } else if (type === 'vocabulary_words') {
      for (const item of items) {
        try {
          if (!item.word) {
            results.errors.push({ item, error: 'Word is required' });
            continue;
          }

          const wordId = item.wordId || uuidv4();
          const word = {
            wordId,
            word: item.word.toLowerCase().trim(),
            definition: item.definition || '',
            example: item.example || '',
            partOfSpeech: item.partOfSpeech || 'noun',
            level: item.level || 'beginner',
            category: item.category || 'general',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await dynamodb.put({
            TableName: VOCABULARY_WORDS_TABLE,
            Item: word
          }).promise();

          results.success.push({ wordId, word: word.word });
        } catch (error) {
          results.errors.push({ item, error: error.message });
        }
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Type must be "grammar_lessons" or "vocabulary_words"' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Bulk upload completed: ${results.success.length} successful, ${results.errors.length} errors`,
        results
      })
    };
  } catch (error) {
    console.error('Error in bulk upload:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process bulk upload',
        message: error.message
      })
    };
  }
};

