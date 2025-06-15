import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
// import pool from './db';
import { fetchComments } from './getComments.js';
import { getEmbeddings } from './getEmbeddings.js';
import { getClusters } from './getClusters.js';

const app = express();
const PORT = 4444;

// Middlewares
app.use(cors());
app.use(express.json());

app.get('/api/test', async (req, res) => {
  res.json({ text: 'Ответ сервера' });
});

// Routes
app.get('/api/items', async (req, res) => {
  try {
    const allItems = await pool.query('SELECT * FROM items');
    res.json(allItems.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.post('/api/getComments', async (req, res) => {
  const { id } = req.body;
  const comments = await fetchComments({ videoId: id });
  res.json(comments);
});

app.post('/api/getEmbeddings', async (req, res) => {
  const { id } = req.body;
  const comments = await fetchComments({ videoId: id });
  const embeddings = await getEmbeddings(comments);
  res.json(embeddings);
});

app.post('/api/getClusters', async (req, res) => {
  const { id } = req.body;
  const comments = await fetchComments({ videoId: id });
  const embeddings = await getEmbeddings(comments);
  const clusters = await getClusters(embeddings);

  // console.log('clusters >>> ', clusters);
  res.json(clusters);
});

app.post('/api/getClustersPy', async (req, res) => {
  const { id: videoId } = req.body;
  const pythonProcess = spawn('python', ['./server/py/clustering.py', videoId]);

  let dataOutput = null;
  pythonProcess.stdout.on('data', (data) => {
    if (!dataOutput) {
      dataOutput = JSON.parse(data.toString());
      res.json(dataOutput);
    }
  });
});

app.post('/api/items', async (req, res) => {
  try {
    const { name } = req.body;
    const newItem = await pool.query(
      'INSERT INTO items (name) VALUES($1) RETURNING *',
      [name]
    );
    res.json(newItem.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});