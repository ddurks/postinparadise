const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = "postinparadise";

exports.handler = async (event) => {
  const params = {
    TableName: tableName,
  };
  const sourceIp = event.requestContext.identity.sourceIp;
  console.log("sourceIp: ", sourceIp);

  try {
    const data = await dynamoDb.scan(params).promise();
    const itemsWithLikesCount = data.Items.map((item) => {
      if (item.ipAddress) {
        if (item.ipAddress === sourceIp) {
          item.you = true;
        }
        delete item.ipAddress;
      }
      if (item.likes && item.likes.values) {
        item.likes = item.likes.values.length;
      } else {
        item.likes = 0;
      }
      return item;
    });
    return {
      statusCode: 200,
      body: JSON.stringify(itemsWithLikesCount),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods": "OPTIONS,GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to retrieve posts",
        error: err.toString(),
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods": "OPTIONS,GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
};
