const API_BASE_URL =
  "https://tvlz7xvap7.execute-api.us-east-2.amazonaws.com/paradise"; // Adjust to your server's URL

export const ClientService = {
  // Fetch all posts
  getPosts: async () => {
    const response = await fetch(`${API_BASE_URL}/posts`);
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  },

  // Attempt to create a new post
  addPost: async (newPost) => {
    const response = await fetch(`${API_BASE_URL}/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newPost),
    });

    if (response.status === 409) {
      return false;
    }
    if (!response.ok) {
      throw new Error(await response.text()); // This will throw an error with the server's response text (e.g., 'User already has a post.').
    }

    console.log("response: ", JSON.stringify(response));
    const result = await response.json();
    console.log("result: ", JSON.stringify(result));
    return result.postId; // Return the new post's ID
  },

  // Add a like to a specific post
  addLike: async (postId) => {
    const response = await fetch(`${API_BASE_URL}/post`, {
      method: "POST",
      body: JSON.stringify({
        postId: postId,
        updateType: "like",
      }),
    });
    if (response.status === 409) {
      return false;
    }
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  },
};
