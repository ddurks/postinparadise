const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const { TwitterApi } = require("twitter-api-v2");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = "postinparadise";
const POST_TIMEOUT = 24 * 60 * 60 * 1000;

const secretsManager = new AWS.SecretsManager();

async function getTwitterCredentials() {
  const data = await secretsManager
    .getSecretValue({ SecretId: "postinparadise/secrets" })
    .promise();
  return JSON.parse(data.SecretString);
}

async function fetchCurrentLikes(postId) {
  const params = {
    TableName: tableName,
    Key: { postId: postId },
    ProjectionExpression: "likes",
  };

  const result = await dynamoDb.get(params).promise();
  return result.Item ? result.Item.likes : new Set();
}

exports.handler = async (event) => {
  const requestBody = JSON.parse(event.body);
  const sourceIp = event.requestContext.identity.sourceIp;

  let result = await createOrUpdatePost(requestBody, sourceIp);

  return {
    statusCode: result.statusCode,
    body: result.body,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
    },
  };
};

const createOrUpdatePost = async (requestBody, sourceIp) => {
  const { updateType, content, color } = requestBody;
  if (updateType === "create") {
    const queryParams = {
      TableName: tableName,
      IndexName: "ipAddress-createdAt-index",
      KeyConditionExpression: "#ip = :ipValue",
      ExpressionAttributeNames: {
        "#ip": "ipAddress",
      },
      ExpressionAttributeValues: {
        ":ipValue": sourceIp,
      },
      ScanIndexForward: false,
      Limit: 1,
    };

    try {
      const queryResult = await dynamoDb.query(queryParams).promise();
      if (queryResult.Items.length > 0) {
        const mostRecentPost = queryResult.Items[0];
        const postAge =
          Date.now() - new Date(mostRecentPost.createdAt).getTime();
        if (postAge <= POST_TIMEOUT) {
          if (mostRecentPost.ipAddress) {
            delete mostRecentPost.ipAddress;
          }
          return {
            statusCode: 409,
            body: JSON.stringify({
              message:
                "A new post cannot be created within 24 hours of your last post.",
              post: mostRecentPost,
            }),
          };
        }
      }

      const putParams = {
        TableName: tableName,
        Item: {
          postId: uuidv4(),
          content: content,
          ipAddress: sourceIp,
          color: color,
          likes: dynamoDb.createSet([sourceIp]), // Initialize likes as a Set with the sourceIp
          createdAt: new Date().toISOString(),
        },
      };

      await dynamoDb.put(putParams).promise();
      var tweetUrl = "";
      try {
        // Retrieve Twitter credentials from AWS Secrets Manager
        const credentials = await getTwitterCredentials();

        const twitterClient = new TwitterApi({
          appKey: credentials.appKey,
          appSecret: credentials.appSecret,
          accessToken: credentials.accessToken,
          accessSecret: credentials.accessSecret,
        });

        const result = await twitterClient.v2.tweet(
          content + "\n\n🌴 https://postinparadise.com"
        );
        console.log("Tweet posted:", JSON.stringify(result));
        tweetUrl = `https://twitter.com/postinparadise/status/${result.data.id}`;
        console.log("Tweet URL:", tweetUrl);
      } catch (err) {
        console.log("Tweet Error:", JSON.stringify(err));
        return {
          statusCode: 500,
          body: JSON.stringify({
            message:
              "Post created, Error while tweeting it: " + JSON.stringify(err),
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Successfully posted & tweeted 🏝",
          postId: putParams.Item.postId,
          tweetUrl: tweetUrl,
        }),
      };
    } catch (err) {
      console.error("Error creating post:", JSON.stringify(err));
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to create post",
          error: err.toString(),
        }),
      };
    }
  } else if (updateType === "like") {
    const postId = requestBody.postId;
    const currentLikes = await fetchCurrentLikes(postId);
    const currentLikesCount = currentLikes ? currentLikes.values.length : 0;

    const updateParams = {
      TableName: tableName,
      Key: { postId: postId },
      UpdateExpression: "add likes :ip",
      ExpressionAttributeValues: {
        ":ip": dynamoDb.createSet([sourceIp]),
      },
      ConditionExpression:
        "attribute_not_exists(likes) OR NOT contains (likes, :ip)",
      ReturnValues: "UPDATED_NEW",
    };

    try {
      const updateResult = await dynamoDb.update(updateParams).promise();
      const updatedLikesCount = updateResult.Attributes.likes.values.length;

      if (updatedLikesCount > currentLikesCount) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Post Liked 🏝" }),
        };
      } else {
        return {
          statusCode: 409,
          body: JSON.stringify({ message: "Post already liked by this user." }),
        };
      }
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to like post",
          error: err.toString(),
        }),
      };
    }
  }
};
