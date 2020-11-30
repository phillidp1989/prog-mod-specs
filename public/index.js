document.getElementById("generate-btn").addEventListener("click", generate);

  function loadFile(url,callback){
      PizZipUtils.getBinaryContent(url,callback);
  }
  async function generate() {
      try {
        const { data } = await axios.get('/data');

        loadFile("/spec.docx",function(error,content){
            if (error) { throw error };
  
            // The error object contains additional information when logged with JSON.stringify (it contains a properties object containing all suberrors).
            function replaceErrors(key, value) {
                if (value instanceof Error) {
                    return Object.getOwnPropertyNames(value).reduce(function(error, key) {
                        error[key] = value[key];
                        return error;
                    }, {});
                }
                return value;
            }
  
            function errorHandler(error) {
                console.log(JSON.stringify({error: error}, replaceErrors));
  
                if (error.properties && error.properties.errors instanceof Array) {
                    const errorMessages = error.properties.errors.map(function (error) {
                        return error.properties.explanation;
                    }).join("\n");
                    console.log('errorMessages', errorMessages);
                    // errorMessages is a humanly readable message looking like this :
                    // 'The tag beginning with "foobar" is unopened'
                }
                throw error;
            }
  
            var zip = new PizZip(content);
            var doc;
            try {
                doc=new window.docxtemplater(zip);
            } catch(error) {
                // Catch compilation errors (errors caused by the compilation of the template : misplaced tags)
                errorHandler(error);
            }
  
            doc.setData({
              progCode: data.progCode,
              progTitle: data.progTitle,
              college: data.college,
              school: data.school,
              dept1: data.dept1,
              dept2: data.dept2,
              mode: data.mode,
              campus: data.campus,
              length: data.length,
              atas: data.atas,
              deliveringInstitution2: data.deliveringInstitution2,
              deliveringInstitution3: data.deliveringInstitution3,
              regBody: data.regBody,
              subject1: data.subject1,
              subject2: data.subject2,
              subject3: data.subject3,
              aims: data.aims,
              benchmark: data.benchmark,
              knowledge: data.knowledge,
              skills: data.skills,
              collaboration: data.collaboration,
              noCollab: data.noCollab,
              partner: data.partner,
              noPartner: data.noPartner,
              year1Exists: data.year1Exists,
              year2Exists: data.year2Exists,
              year3Exists: data.year3Exists,
              year4Exists: data.year4Exists,
              year5Exists: data.year5Exists,
              year1: data.years.year1,
              year2: data.years.year2,
              year3: data.years.year3,
              year4: data.years.year4,
              year5: data.years.year5,
            });
            try {
                // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
                doc.render();
            }
            catch (error) {
                // Catch rendering errors (errors relating to the rendering of the template : angularParser throws an error)
                errorHandler(error);
            }
  
            var out=doc.getZip().generate({
                type:"blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }) //Output the document using Data-URI
            saveAs(out,"output.docx")
        })
      } catch (err) {
        console.error('ERROR - index.js - generate', err);
      }
  }