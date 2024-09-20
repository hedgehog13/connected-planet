

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const BASE_URL = process.env.BASE_URL || 'http://some-api.com';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to handle errors
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
};

// Login route
app.post('/login', async (req, res, next) => {
  try {
    const { user, password } = req.body;
    const response = await axios.post(`${BASE_URL}/login`, { user, password });
    if (response.data.token) {
      res.json(response.data);
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  } catch (error) {
    next(error);
  }
});

// Data Center route
app.get('/dataCenter', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const response = await axios.get(`${BASE_URL}/datacenter`, { params: { token } });
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// Real Time Map route
app.get('/realTimeMap', async (req, res, next) => {
  try {
    const { startTime, endTime, interval, token } = req.query;
    if (!startTime || !endTime || !interval || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const response = await axios.get(`${BASE_URL}/data/realTimeMap`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

app.use(express.static('www'));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});