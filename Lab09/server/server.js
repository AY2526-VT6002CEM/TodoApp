const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./firebase'); // Import Firestore instance
const {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} = require('firebase/firestore');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json()); // Built-in JSON parser — no body-parser needed

// User login — creates account if email not found
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const existingUser = usersSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .find((user) => user.email === email);

    // Auto-register if user not found
    if (!existingUser) {
      const newUser = {
        email,
        password,
        createdAt: new Date().toISOString(),
      };
      await addDoc(usersCollection, newUser);
      return res.status(201).json({
        message: 'Account created and login successful!',
        user: newUser.email,
      });
    }

    // Validate password
    if (existingUser.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({ message: 'Login successful', user: existingUser.email });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Data Helpers ───

// Read original seed data from JSON file
const readData = () => {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to read data.json:', error.message);
    return [];
  }
};

// Save current in-memory data back to JSON file
const saveData = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save data.json:', error.message);
  }
};

// Load initial data into memory
let data = readData();

// ─── Task Endpoints ───

// Get all tasks
app.get('/tasks', (req, res) => {
  setTimeout(() => {
    res.json(data);
  }, 1000); // Simulate network delay for frontend testing
});

// Get a specific task by ID
app.get('/tasks/:id', (req, res) => {
  const task = data.find((task) => task._id === req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

// Create a new task
app.post('/tasks', (req, res) => {
  const { title, description, user } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const newTask = {
    _id: uuidv4(),
    createdAt: new Date().toISOString(),
    title,
    description: description || '',
    user: user || 'default_user',
    comments: [],
    commentCount: 0,
  };

  data.push(newTask);
  saveData();
  res.status(201).json(newTask);
});

// Update a task by ID
app.put('/tasks/:id', (req, res) => {
  const taskIndex = data.findIndex((task) => task._id === req.params.id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Merge update — preserves original fields (e.g. comments, _id) not in req.body
  data[taskIndex] = {
    ...data[taskIndex],
    ...req.body,
    _id: req.params.id, // Always keep original ID
  };

  saveData();
  res.json(data[taskIndex]);
});

// Delete a task by ID
app.delete('/tasks/:id', (req, res) => {
  const taskIndex = data.findIndex((task) => task._id === req.params.id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const deletedTask = data.splice(taskIndex, 1)[0];
  saveData();
  res.json(deletedTask);
});

// ─── Comment Endpoints ───

// Get all comments for a specific task
app.get('/tasks/:id/comments', (req, res) => {
  const task = data.find((task) => task._id === req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task.comments);
});

// Add a comment to a specific task
app.post('/tasks/:id/comments', (req, res) => {
  const task = data.find((task) => task._id === req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, user } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Comment title is required' });
  }

  const newComment = {
    id: uuidv4(),
    title,
    user: user || 'anonymous',
    createdAt: new Date().toISOString(),
  };

  task.comments.push(newComment);
  task.commentCount += 1;
  saveData();
  res.status(201).json(newComment);
});

// Delete a comment from a specific task
app.delete('/tasks/:taskId/comments/:commentId', (req, res) => {
  const task = data.find((task) => task._id === req.params.taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const commentIndex = task.comments.findIndex(
    (comment) => comment.id === req.params.commentId
  );

  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const deletedComment = task.comments.splice(commentIndex, 1)[0];
  task.commentCount -= 1;
  saveData();
  res.json(deletedComment);
});

// ─── Utility Endpoints ───

// Reset in-memory data AND data.json to original seed content
app.post('/reset', (req, res) => {
  data = readData();
  res.json({ message: 'Data has been reset to original file content.' });
});

// ─── Start Server ───

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});