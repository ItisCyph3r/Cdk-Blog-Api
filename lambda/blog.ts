import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamoDb = new DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME!;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Content-Type': 'application/json',
};

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Environment:', process.env);
  console.log('Table Name:', tableName);

  try {
    if (!tableName) {
      throw new Error('TABLE_NAME environment variable is not set');
    }

    const method = event.httpMethod;
    console.log(`Processing ${method} request`);

    switch (method) {
      case 'POST': {
        const { title, content } = JSON.parse(event.body || '{}');
        
        if (!title || !content) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Title and content are required' }),
          };
        }

        const newItem = {
          id: uuidv4(),
          title,
          content,
          createdAt: new Date().toISOString(),
        };

        await dynamoDb.put({
          TableName: tableName,
          Item: newItem,
        }).promise();

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ message: 'Post created', post: newItem }),
        };
      }

      case 'GET': {
        const data = await dynamoDb.scan({
          TableName: tableName,
        }).promise();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data.Items),
        };
      }

      case 'PUT': {
        const { id, title, content } = JSON.parse(event.body || '{}');
        
        if (!id || !title || !content) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Id, title, and content are required' }),
          };
        }

        const updatedItem = {
          id,
          title,
          content,
          updatedAt: new Date().toISOString(),
        };

        await dynamoDb.put({
          TableName: tableName,
          Item: updatedItem,
        }).promise();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Post updated', post: updatedItem }),
        };
      }

      case 'DELETE': {
        const { id } = JSON.parse(event.body || '{}');
        
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Id is required' }),
          };
        }

        await dynamoDb.delete({
          TableName: tableName,
          Key: { id },
        }).promise();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Post deleted' }),
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
