const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const GRAMMAR_LESSONS_TABLE = process.env.GRAMMAR_LESSONS_TABLE || 'grammar_lessons';
const TERMS_TABLE = process.env.TERMS_TABLE || 'terms';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { table } = body; // 'grammar_lessons' or 'vocabulary_words'

    if (!table || (table !== 'lessons' && table !== 'terms')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid table name. Must be "lessons" or "terms"' })
      };
    }

    const tableName = table === 'lessons' ? GRAMMAR_LESSONS_TABLE : TERMS_TABLE;
    const keyField = table === 'lessons' ? 'lessonId' : 'termId';
    const uniqueField = table === 'lessons' ? 'title' : 'term';

    // Scan all items
    const scanParams = {
      TableName: tableName
    };

    let allItems = [];
    let lastEvaluatedKey = null;

    do {
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await dynamodb.scan(scanParams).promise();
      allItems = allItems.concat(result.Items || []);
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Find duplicates based on unique field
    const seen = new Map();
    const duplicates = [];
    const toDelete = [];

    for (const item of allItems) {
      const uniqueValue = item[uniqueField]?.toLowerCase().trim();
      
      if (!uniqueValue) continue;

      if (seen.has(uniqueValue)) {
        // This is a duplicate
        const existing = seen.get(uniqueValue);
        
        // Keep the one with the most recent updatedAt or createdAt
        const existingDate = existing.updatedAt || existing.createdAt || '';
        const currentDate = item.updatedAt || item.createdAt || '';
        
        if (currentDate > existingDate) {
          // Current item is newer, delete the old one
          toDelete.push(existing[keyField]);
          seen.set(uniqueValue, item);
          duplicates.push({ kept: item[keyField], deleted: existing[keyField], value: uniqueValue });
        } else {
          // Existing item is newer or same, delete current
          toDelete.push(item[keyField]);
          duplicates.push({ kept: existing[keyField], deleted: item[keyField], value: uniqueValue });
        }
      } else {
        seen.set(uniqueValue, item);
      }
    }

    // Delete duplicates
    const deleted = [];
    const errors = [];

    for (const id of toDelete) {
      try {
        await dynamodb.delete({
          TableName: tableName,
          Key: { [keyField]: id }
        }).promise();
        deleted.push(id);
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Cleanup completed',
        table: tableName,
        totalItems: allItems.length,
        uniqueItems: seen.size,
        duplicatesFound: duplicates.length,
        deleted: deleted.length,
        errors: errors.length,
        details: {
          duplicates: duplicates.slice(0, 10), // Show first 10
          deletedIds: deleted.slice(0, 10),
          errors: errors
        }
      })
    };
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to clean duplicates',
        message: error.message
      })
    };
  }
};


