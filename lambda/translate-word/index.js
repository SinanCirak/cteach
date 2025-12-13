const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const translate = new AWS.Translate({ region: process.env.AWS_REGION || 'ca-central-1' });

const TABLE_NAME = process.env.TRANSLATIONS_TABLE || 'word_translations';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    // Get word from path parameter
    const word = event.pathParameters?.word?.toLowerCase().trim();
    
    if (!word) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Word parameter is required' })
      };
    }

    // Get target language from query parameter (default: tr)
    const targetLanguage = event.queryStringParameters?.target || 'tr';

    // Normalize word (remove punctuation, etc.)
    const normalizedWord = word.replace(/[.,!?;:()"]/g, '').toLowerCase();
    
    if (!normalizedWord || normalizedWord.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid word' })
      };
    }

    // Create cache key with language
    const cacheKey = `${normalizedWord}_${targetLanguage}`;

    // Check cache first
    const cacheResult = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { word: cacheKey }
    }).promise();

    if (cacheResult.Item) {
      // Update usage count
      await dynamodb.update({
        TableName: TABLE_NAME,
        Key: { word: cacheKey },
        UpdateExpression: 'ADD usageCount :inc',
        ExpressionAttributeValues: { ':inc': 1 }
      }).promise();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          word: cacheResult.Item.word.split('_')[0], // Remove language suffix
          translation: cacheResult.Item.translation,
          source: 'cache'
        })
      };
    }

    // Not in cache, use AWS Translate
    const translateParams = {
      Text: normalizedWord,
      SourceLanguageCode: 'en',
      TargetLanguageCode: targetLanguage
    };

    const translateResult = await translate.translateText(translateParams).promise();

    const translation = translateResult.TranslatedText;

    // Save to cache with language key
    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: {
        word: cacheKey,
        translation: translation,
        sourceLanguage: 'en',
        targetLanguage: targetLanguage,
        createdAt: new Date().toISOString(),
        usageCount: 1
      }
    }).promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        word: normalizedWord,
        translation: translation,
        source: 'aws-translate'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

