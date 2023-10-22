const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

console.log("Starting app.js");

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'paradisedb',
    password: 'password',
    port: 5432,
});

app.use(bodyParser.json());
app.set('trust proxy', true);

app.use(cors({
    origin: 'http://localhost:5173'  // Adjust this to your frontend's localhost port
}));

app.use(express.static(path.join(__dirname, 'dist')));

app.post('/posts', async (req, res) => {
    const client = await pool.connect();
    try {
        const ipAddress = req.ip;
        const { content } = req.body;

        await client.query('BEGIN');

        // Check if user already has a post
        const userPost = await client.query('SELECT * FROM posts INNER JOIN users ON users.id = posts.user_id WHERE users.ip_address = $1', [ipAddress]);

        if (userPost.rows.length > 0) {
            // User already has a post; update the content and clear the likes
            const postId = userPost.rows[0].id;

            // Update the post content
            await client.query('UPDATE posts SET content = $1, likes_count = $2 WHERE id = $3', [content, 0, postId]);

            // Clear the likes for the post (assuming you have a likes table)
            await client.query('DELETE FROM likes WHERE post_id = $1', [postId]);

            await client.query('COMMIT');
            res.json({ postId });
        } else {
            // User doesn't have a post; create a new one
            const user = await client.query('INSERT INTO users (ip_address) VALUES ($1) RETURNING id', [ipAddress]);
            const post = await client.query('INSERT INTO posts (content, user_id) VALUES ($1, $2) RETURNING id', [content, user.rows[0].id]);

            await client.query('COMMIT');
            res.json({ postId: post.rows[0].id });
        }
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).send('Server error.');
    } finally {
        client.release();
    }
});

app.get('/posts', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM posts');
      res.json({ posts: result.rows });
    } catch (err) {
      console.error('Error fetching posts:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/posts/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const result = await pool.query('SELECT * FROM posts WHERE user_id = $1', [userId]);
      res.json(result.rows? result.rows[0] : {});
    } catch (err) {
      console.error('Error fetching post:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/userid', async (req, res) => {
    try {
      const ipAddress = req.ip;
      const result = await pool.query('SELECT * FROM users WHERE ip_address = $1', [ipAddress]);
      res.json({ user: result.rows });
    } catch (err) {
      console.error('Error fetching posts:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT a like
app.put('/posts/:id/like', async (req, res) => {
    const client = await pool.connect();
    try {
        const postId = req.params.id;
        const ipAddress = req.ip;

        // Check if user already liked the post
        const userLike = await client.query('SELECT * FROM likes INNER JOIN users ON users.id = likes.user_id WHERE users.ip_address = $1 AND likes.post_id = $2', [ipAddress, postId]);
        if (userLike.rows.length > 0) {
            res.status(400).send('User already liked this post.');
            return;
        }

        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE ip_address = $1', [ipAddress]);
        if (user.rows.length === 0) {
            res.status(400).send('User not found.');
            return;
        }
        await client.query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2)', [postId, user.rows[0].id]);
        await client.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
        await client.query('COMMIT');

        res.send({success: true});
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).send('Server error.');
    } finally {
        client.release();
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
