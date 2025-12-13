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

    // Not in cache, use AWS Translate with context for better accuracy
    // Priority: Try verb form first (infinitive), then noun form
    let translation = null;
    
    // First, try verb form with "to [word]" - this gives infinitive form
    // For Turkish: "to drink" -> "içmek" (infinitive verb)
    try {
      const verbContext = `to ${normalizedWord}`;
      const translateParams = {
        Text: verbContext,
        SourceLanguageCode: 'en',
        TargetLanguageCode: targetLanguage
      };
      
      const translateResult = await translate.translateText(translateParams).promise();
      const translatedText = translateResult.TranslatedText;
      
      if (translatedText) {
        // Extract the verb from the translation
        // For Turkish: "to drink" -> "içmek" (usually just one word)
        // For other languages, extract the verb part
        const words = translatedText.split(/\s+/);
        
        if (targetLanguage === 'tr') {
          // For Turkish, look for infinitive verb (ends with mek/mak)
          for (const word of words) {
            const cleanWord = word.replace(/[.,!?;:()"]/g, '').toLowerCase();
            if (cleanWord.endsWith('mek') || cleanWord.endsWith('mak')) {
              translation = cleanWord;
              break;
            }
          }
          // If no infinitive found, take the last word (usually the verb)
          if (!translation && words.length > 0) {
            translation = words[words.length - 1].replace(/[.,!?;:()"]/g, '').toLowerCase();
          }
        } else {
          // For other languages, take the verb part (usually last word after "to")
          if (words.length > 0) {
            // Skip "to" translation if it exists (usually first word)
            const verbWord = words.length > 1 ? words[words.length - 1] : words[0];
            translation = verbWord.replace(/[.,!?;:()"]/g, '').toLowerCase();
          }
        }
      }
    } catch (err) {
      console.log(`Verb context translation failed:`, err.message);
    }
    
    // If verb translation didn't work or seems wrong, try noun form
    // But only if verb translation is not an infinitive (for Turkish)
    const isVerbForm = targetLanguage === 'tr' && translation && 
                      (translation.endsWith('mek') || translation.endsWith('mak'));
    
    if (!translation || (!isVerbForm && targetLanguage === 'tr')) {
      try {
        const nounContext = `the ${normalizedWord}`;
        const translateParams = {
          Text: nounContext,
          SourceLanguageCode: 'en',
          TargetLanguageCode: targetLanguage
        };
        
        const translateResult = await translate.translateText(translateParams).promise();
        const translatedText = translateResult.TranslatedText;
        
        if (translatedText) {
          const words = translatedText.split(/\s+/);
          // Skip article translation (usually first word: "the" -> "o", "a" -> "bir", etc.)
          // Take the noun (usually second word or last word)
          if (words.length > 1) {
            translation = words[1].replace(/[.,!?;:()"]/g, '').toLowerCase();
          } else if (words.length > 0) {
            translation = words[0].replace(/[.,!?;:()"]/g, '').toLowerCase();
          }
        }
      } catch (err) {
        console.log(`Noun context translation failed:`, err.message);
      }
    }
    
    // Fallback to direct translation if context-based translation failed
    if (!translation) {
      const translateParams = {
        Text: normalizedWord,
        SourceLanguageCode: 'en',
        TargetLanguageCode: targetLanguage
      };
      
      const translateResult = await translate.translateText(translateParams).promise();
      translation = translateResult.TranslatedText.replace(/[.,!?;:()"]/g, '').trim();
    }

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

