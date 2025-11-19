import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getRandomWord } from './storage';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GetRandom handler invoked');

  try {
    const word = await getRandomWord();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ word })
    };
  } catch (error) {
    console.error('Error in GetRandom handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
