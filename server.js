// Load environment variables first, before anything else
require('dotenv').config();

const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const { errorHandler, initializeErrorHandlers } = require('./middleware/errorHandler');
const { corsOptions, helmetOptions, validateEnvironmentVariables } = require('./config/security');

// Validate environment variables before starting server
validateEnvironmentVariables();

// Initialize global error handlers
initializeErrorHandlers();

const PORT = process.env.PORT || 8080;
const app = express();

// Trust proxy - Required for Heroku deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmetOptions);
app.use(cors(corsOptions));
app.use(compression());

// Body parsing middleware (MUST come before routes)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static("public"));

app.get('/download-spec/term/2020', (req, res, next) => {
  const docPath = path.join(__dirname, '/public', 'specterm2020.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      console.error('Error downloading term 2020 spec:', err);
      if (!res.headersSent) {
        next(err);
      }
    }
  })
})

app.get('/download-spec/term/2021', (req, res, next) => {
  const docPath = path.join(__dirname, '/public', 'specterm2021.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      console.error('Error downloading term 2021 spec:', err);
      if (!res.headersSent) {
        next(err);
      }
    }
  })
})

app.get('/download-spec/cohort/2020', (req, res, next) => {
  const docPath = path.join(__dirname, '/public', 'speccohort2020.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      console.error('Error downloading cohort 2020 spec:', err);
      if (!res.headersSent) {
        next(err);
      }
    }
  })
})

app.get('/download-spec/cohort/2021', (req, res, next) => {
  const docPath = path.join(__dirname, '/public', 'speccohort2021.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      console.error('Error downloading cohort 2021 spec:', err);
      if (!res.headersSent) {
        next(err);
      }
    }
  })
})

app.get('/download-module-spec', (req, res, next) => {
  const docPath = path.join(__dirname, '/public', 'module-spec.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      console.error('Error downloading module spec:', err);
      if (!res.headersSent) {
        next(err);
      }
    }
  })
})

// API routes (MUST come after body parsers)
app.use('/', apiRoutes);

// Global error handler (MUST be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
  console.log('✓ Security middleware enabled');
  console.log('✓ Error handlers initialized');
})