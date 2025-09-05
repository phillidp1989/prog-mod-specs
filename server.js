const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const PORT = process.env.PORT || 8080;
const app = express();

// Serve modern UI at /modern
app.get('/modern', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-modern.html'));
});

app.get('/download-spec/term/2020', (req, res) => {
  const docPath = path.join(__dirname, '/public', 'specterm2020.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      throw err;
    }
  })
})

app.get('/download-spec/term/2021', (req, res) => {
  const docPath = path.join(__dirname, '/public', 'specterm2021.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      throw err;
    }
  })
})

app.get('/download-spec/cohort/2020', (req, res) => {
  const docPath = path.join(__dirname, '/public', 'speccohort2020.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      throw err;
    }
  })
})

app.get('/download-spec/cohort/2021', (req, res) => {
  const docPath = path.join(__dirname, '/public', 'speccohort2021.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      throw err;
    }
  })
})

app.get('/download-module-spec', (req, res) => {
  const docPath = path.join(__dirname, '/public', 'module-spec.docx');
  res.download(docPath, 'spec.docx', function(err) {
    if (err) {
      throw err;
    }
  })
})

app.use(apiRoutes);
app.use(express.static("public")); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
})