import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getWordGraph } from './storage';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GetWord handler invoked', { pathParameters: event.pathParameters });

  try {
    const word = event.pathParameters?.word;
    const depth = parseInt(event.queryStringParameters?.depth || '2');

    if (!word) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Word parameter required' })
      };
    }

    console.log(`Fetching graph for word: ${word}, depth: ${depth}`);
    const result = await getWordGraph(word, depth);

    if (result.nodes.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Word not found' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error in GetWord handler:', error);
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
