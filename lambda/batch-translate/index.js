const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const translate = new AWS.Translate({ region: process.env.AWS_REGION || 'ca-central-1' });

const TABLE_NAME = process.env.TRANSLATIONS_TABLE || 'word_translations';
const BATCH_SIZE = 25; // AWS Translate batch limit

/**
 * Extract unique words from text
 */
function extractWords(text) {
  // Remove punctuation and split into words
  const words = text.toLowerCase()
    .replace(/[.,!?;:()"'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && /^[a-z]+$/.test(word));
  
  // Return unique words
  return [...new Set(words)];
}

/**
 * Translate words in batch
 */
async function translateBatch(words, targetLanguage) {
  const results = [];
  const wordsToTranslate = [];
  
  // Check cache first
  for (const word of words) {
    const cacheKey = `${word}_${targetLanguage}`;
    const cacheResult = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { word: cacheKey }
    }).promise();
    
    if (cacheResult.Item) {
      results.push({
        word: word,
        translation: cacheResult.Item.translation,
        source: 'cache'
      });
    } else {
      wordsToTranslate.push(word);
    }
  }
  
  // Translate words not in cache (in batches of 25)
  for (let i = 0; i < wordsToTranslate.length; i += BATCH_SIZE) {
    const batch = wordsToTranslate.slice(i, i + BATCH_SIZE);
    
    // AWS Translate doesn't have batch API, so we translate individually
    // But we can do it in parallel
    const translatePromises = batch.map(async (word) => {
      try {
        const translateParams = {
          Text: word,
          SourceLanguageCode: 'en',
          TargetLanguageCode: targetLanguage
        };
        
        const translateResult = await translate.translateText(translateParams).promise();
        const translation = translateResult.TranslatedText;
        
        // Save to cache
        const cacheKey = `${word}_${targetLanguage}`;
        await dynamodb.put({
          TableName: TABLE_NAME,
          Item: {
            word: cacheKey,
            translation: translation,
            sourceLanguage: 'en',
            targetLanguage: targetLanguage,
            createdAt: new Date().toISOString(),
            usageCount: 0
          }
        }).promise();
        
        return {
          word: word,
          translation: translation,
          source: 'aws-translate'
        };
      } catch (error) {
        console.error(`Error translating ${word}:`, error);
        return {
          word: word,
          translation: null,
          error: error.message,
          source: 'error'
        };
      }
    });
    
    const batchResults = await Promise.all(translatePromises);
    results.push(...batchResults);
  }
  
  return results;
}

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
    const { text, targetLanguage = 'tr' } = body;
    
    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text parameter is required' })
      };
    }

    // Extract words from text
    const words = extractWords(text);
    
    if (words.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ translations: [] })
      };
    }

    // Translate words
    const translations = await translateBatch(words, targetLanguage);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        translations: translations,
        totalWords: words.length,
        cached: translations.filter(t => t.source === 'cache').length,
        translated: translations.filter(t => t.source === 'aws-translate').length
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




