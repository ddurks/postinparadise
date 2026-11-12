// Posts live only in this browser's localStorage now that the backend is gone.
const STORAGE_KEY = "paradisePosts";

const DEFAULT_POSTS = [
  {
    postId: "welcome",
    content: "Welcome to Paradise!",
    color: "ff9e00",
    likes: 0,
    you: false,
  },
];

const readPosts = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
  } catch (error) {
    console.error("Error reading posts: ", error);
  }
  return DEFAULT_POSTS.map((post) => ({ ...post }));
};

const writePosts = (posts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error("Error saving posts: ", error);
  }
};

export const ClientService = {
  getPosts: async () => readPosts(),

  // Only the newest post gets the "you" marker
  addPost: async (newPost) => {
    const posts = readPosts().map((post) => ({ ...post, you: false }));
    const post = {
      postId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: newPost.content,
      color: newPost.color,
      likes: 0,
      you: true,
    };
    posts.push(post);
    writePosts(posts);
    return post;
  },

  addLike: async (postId) => {
    const posts = readPosts();
    const post = posts.find((p) => p.postId === postId);
    if (!post) {
      return false;
    }
    post.likes += 1;
    writePosts(posts);
    return post;
  },
};
