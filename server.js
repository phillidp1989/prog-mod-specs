const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const PORT = process.env.PORT || 8080;
const app = express();

app.get('/download-spec', (req, res) => {
  const docPath = path.join(__dirname, '/public', 'spec.docx');
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