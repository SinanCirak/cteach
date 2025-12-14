const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const IMAGES_BUCKET = process.env.IMAGES_BUCKET || 'cteach-website-prod-images';

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
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { fileName, fileType } = body;

      if (!fileName || !fileType) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'File name and type are required' })
        };
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(fileType)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid file type. Only images are allowed.' })
        };
      }

      // Generate unique file name
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const key = `images/${uniqueFileName}`;

      // Generate presigned URL for upload
      const params = {
        Bucket: IMAGES_BUCKET,
        Key: key,
        ContentType: fileType,
        Expires: 300 // 5 minutes
      };

      const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

      // Return upload URL and file key
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          uploadUrl,
          fileKey: key,
          fileUrl: `https://${IMAGES_BUCKET}.s3.${process.env.AWS_REGION || 'ca-central-1'}.amazonaws.com/${key}`
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate upload URL',
        message: error.message
      })
    };
  }
};


