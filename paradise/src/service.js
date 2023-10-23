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
    const response = await fetch(`${API_BASE_URL}/posts/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  },

  // Attempt to create a new post
  addPost: async (newPost) => {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newPost),
    });

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
