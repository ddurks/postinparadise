const API_BASE_URL = "https://postinparadise.com"; // Adjust to your server's URL

export const ClientService = {
  // Fetch all posts
  getUserId: async () => {
    const response = await fetch(`${API_BASE_URL}/userId`);
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  },

  // Fetch all posts
  getPosts: async () => {
    const response = await fetch(`${API_BASE_URL}/posts`);
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  },

  // Fetch a post by userId
  getPostsById: async (userId) => {
    console.log(userId);
    const response = await fetch(`${API_BASE_URL}/posts/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  },

  // Submit a new post
  postPost: async (postContent) => {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: postContent }),
    });
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  },

  addPost: async (content) => {
    // Send the POST request
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content,
      }),
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(await response.text()); // This will throw an error with the server's response text (e.g., 'User already has a post.').
    }

    const result = await response.json();
    return result.postId; // Return the new post's ID
  },

  // Add a like to a specific post
  addLike: async (postId) => {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  },
};
