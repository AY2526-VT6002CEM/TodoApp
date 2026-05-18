const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());

app.use(express.json());

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

// Load initial data into memory only.
// Changes made by POST, PUT, and DELETE are NOT saved back to data.json.
// Restart the server (or call /reset) to restore the original data.
let data = readData();

// Get all tasks
app.get('/tasks', (req, res) => {
  setTimeout(() => {
    res.json(data);
  }, 2000); // Simulate network delay for frontend testing
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
  const newTask = req.body;

  // if (!newTask._id) {
  //   return res.status(400).json({ error: '_id is required' });
  // }

  // const existingTask = data.find((task) => task._id === newTask._id);
  // if (existingTask) {
  //   return res.status(409).json({ error: 'Task with this _id already exists' });
  // }

  newTask.createdAt = new Date().toISOString();

  data.push(newTask);
  res.status(201).json(newTask);
});

// Update a task by ID
app.put('/tasks/:id', (req, res) => {
  const taskIndex = data.findIndex((task) => task._id === req.params.id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  data[taskIndex] = {
    ...req.body,
    _id: req.params.id, // Keep original ID
  };

  res.json(data[taskIndex]);
});

// Delete a task by ID
app.delete('/tasks/:id', (req, res) => {
  const taskIndex = data.findIndex((task) => task._id === req.params.id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const deletedTask = data.splice(taskIndex, 1)[0];
  res.json(deletedTask);
});

// Reset in-memory data to original file content
app.post('/reset', (req, res) => {
  data = readData();
  res.json({ message: 'Data has been reset to original file content.' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});