import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamoDb = new DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod;

  if (method === 'POST') {
    const { title, content } = JSON.parse(event.body || '{}');
    const newItem = {
      id: uuidv4(),
      title,
      content,
      createdAt: new Date().toISOString(),
    };

    await dynamoDb.put({ TableName: tableName, Item: newItem }).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Post created', post: newItem }),
    };
  }

  if (method === 'GET') {
    const data = await dynamoDb.scan({ TableName: tableName }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(data.Items),
    };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
