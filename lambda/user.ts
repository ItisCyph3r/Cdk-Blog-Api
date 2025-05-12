import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Only PUT allowed' };
  }

  const { name } = JSON.parse(event.body || '{}');

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `User updated: ${name}` }),
  };
};
