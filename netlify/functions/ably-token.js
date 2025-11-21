const Ably = require('ably');

exports.handler = async (event, context) => {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing ABLY_API_KEY environment variable' }),
    };
  }

  const client = new Ably.Realtime(apiKey);

  try {
    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: 'whisps-user', // You can customize this or pass it from the query params
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(tokenRequestData),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error requesting token: ' + err.message }),
    };
  }
};
