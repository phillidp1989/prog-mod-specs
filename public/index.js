M.AutoInit();

const generateBtn = document.getElementById("generate-btn");
const generateBtnMod = document.getElementById("generate-btn-mod");
const input = document.getElementById("autocomplete-input");
const moduleInput = document.getElementById("module-autocomplete-input");
const elems = document.getElementById("cohort");
const tabs = document.querySelector(".tabs");
const instance = M.Tabs.init(tabs);
const drop = M.FormSelect.init(elems);
$('.modal').modal();

generateBtn.addEventListener("click", generate);
generateBtnMod.addEventListener("click", generateMod);

$("#cohort").on("change", function () {
  cohort = $(this).val();
});
$("#year").on("change", function () {
  year = $(this).val();
});
$("#mod-year").on("change", function () {
  modYear = $(this).val();
});

let cohort = "";
let year = "";
let modYear = "";

// Populate autocomplete
window.addEventListener("load", async () => {
  const { data } = await axios.get("/autocomplete-data");
  $("input#autocomplete-input").autocomplete({
    data: { ...data },
  });
  $('.prog-initializer').addClass('hide');
  $('.form-content').removeClass('hide');  
});

window.addEventListener("load", async () => {
  try {
    const { data } = await axios.get('/mod-autocomplete-data');
  await $("input#module-autocomplete-input").autocomplete({
    data: { ...data },
  });
  $('.mod-initializer').addClass('hide');  
  $('.mod-form-content').removeClass('hide');  
  } catch (err) {
    console.error(err);
  }  
})

function loadFile(url, callback) {
  PizZipUtils.getBinaryContent(url, callback);
}



async function generateMod() {       
  if (modYear === '' && moduleInput.value === '') {
    $('#alert').text('Please specify a module code and year')
    $('#modal1').modal('open');
    return;
  }
  if (modYear === '' && moduleInput.value !== '') {
    $('#alert').text('Please choose an academic year')
    $('#modal1').modal('open');
    return;
  }
  if (modYear !== '' && moduleInput.value === '') {
    $('#alert').text('Please specify a module code')
    $('#modal1').modal('open');
    return;
  }
  
  if (moduleInput.value.length < 5) {
    $('#alert').text('The module code you have entered is too short. This must be 5 digits.')
    $('#modal1').modal('open');
    return;
  }

  const inputNum = parseInt(moduleInput.value.substr(0, 5));
  if (isNaN(inputNum)) {
    $('#alert').text('The module code you entered is not valid. This must be a 5 digit code')
    $('#modal1').modal('open');
    return;
  }  
  
  $('#generate-btn-mod').addClass('hide');
  $('.mod-loading').removeClass('hide');  
  let docPath = `/module-spec.docx`;
  const moduleCode = moduleInput.value.substr(0, 5);
  try {
    const { data } = await axios.get(`/mod-data/${moduleCode}/${modYear}`);
    loadFile(docPath, function (error, content) {
      if (error) {
        throw error;
      }

      // The error object contains additional information when logged with JSON.stringify (it contains a properties object containing all suberrors).
      function replaceErrors(key, value) {
        if (value instanceof Error) {
          return Object.getOwnPropertyNames(value).reduce(function (
            error,
            key
          ) {
            error[key] = value[key];
            return error;
          },
          {});
        }
        return value;
      }

      function errorHandler(error) {
        console.log(JSON.stringify({ error: error }, replaceErrors));

        if (error.properties && error.properties.errors instanceof Array) {
          const errorMessages = error.properties.errors
            .map(function (error) {
              return error.properties.explanation;
            })
            .join("\n");
          console.log("errorMessages", errorMessages);
          // errorMessages is a humanly readable message looking like this :
          // 'The tag beginning with "foobar" is unopened'
        }
        throw error;
      }

      var zip = new PizZip(content);
      var doc;
      try {
        doc = new window.docxtemplater(zip, {
          nullGetter() {
            return "";
          },
        });
      } catch (error) {
        // Catch compilation errors (errors caused by the compilation of the template : misplaced tags)
        errorHandler(error);
      }

      doc.setData({        
        code: data.code,
        title: data.title,
        school: data.school,
        dept: data.dept,
        level: data.level,
        credits: data.credits,
        semester: data.semester,
        attachedProgs: data.attachedProgs,
        prereqs: data.prereqs,
        coreqs: data.coreqs,
        campus: data.campus,
        lecture: data.lecture,
        seminar: data.seminar,
        tutorial: data.tutorial,
        project: data.project,
        demo: data.demo,
        practical: data.practical,
        workshop: data.workshop,
        fieldwork: data.fieldwork,
        visits: data.visits,
        work: data.work,
        placement: data.placement,
        independent: data.independent,
        abroad: data.abroad,
        description: data.description,
        outcomes: data.outcomes,
        summative: data.summative,
        reassessment: data.reassessment,
        ctExam: data.ctExam,
        examPeriod: data.examPeriod,
        lead: data.lead,
      });
      try {
        // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
        doc.render();
      } catch (error) {
        // Catch rendering errors (errors relating to the rendering of the template : angularParser throws an error)
        errorHandler(error);
      }

      var out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }); //Output the document using Data-URI
      saveAs(out, `${data.code} ${data.title}.docx`);      
    });
    $('#generate-btn-mod').removeClass('hide');
    $('.mod-loading').addClass('hide');    
  } catch (err) {
    console.error("ERROR - index.js - generate", err);    
    $('#generate-btn-mod').removeClass('hide');
    $('.mod-loading').addClass('hide'); 
    $('#alert').text('Spec could not be generated, please try again')
    $('#modal1').modal('open');
  }
}



async function generate() {
  if (year === '' && cohort === '' && input.value === '') {
    $('#alert').text('Please provide a programme code and academic year')
    $('#modal1').modal('open');
    return;
  }

  if (year === '' && cohort === '') {
    $('#alert').text('Please provide an academic year and select whether you would like to generate a cohort or academic year spec')
    $('#modal1').modal('open');
    return;
  }

  if (year === '' && input.value === '') {
    $('#alert').text('Please provide a programme code and academic year')
    $('#modal1').modal('open');
    return;
  }

  if (cohort === '') {
    $('#alert').text('Please select whether you would like to generate a spec by cohort of academic year')
    $('#modal1').modal('open');
    return;
  }

  if (year === '') {
    $('#alert').text('Please select an academic year')
    $('#modal1').modal('open');
    return;
  }

  if (input.value === '') {
    $('#alert').text('Please provide a valid programme code')
    $('#modal1').modal('open');
    return;
  }

  if (input.value.length < 4) {
    $('#alert').text('Please provide a valid programme code')
    $('#modal1').modal('open');
    return;
  }

  $('#generate-btn').addClass('hide');
  $('.loading').removeClass('hide');  
  let docPath = `/spec${cohort}${year}.docx`;
  const progCode = input.value.substr(0, 4);
  try {
    const { data } = await axios.get(`/prog-data/${progCode}/${cohort}/${year}`);
    loadFile(docPath, function (error, content) {
      if (error) {
        throw error;
      }

      // The error object contains additional information when logged with JSON.stringify (it contains a properties object containing all suberrors).
      function replaceErrors(key, value) {
        if (value instanceof Error) {
          return Object.getOwnPropertyNames(value).reduce(function (
            error,
            key
          ) {
            error[key] = value[key];
            return error;
          },
          {});
        }
        return value;
      }

      function errorHandler(error) {
        console.log(JSON.stringify({ error: error }, replaceErrors));

        if (error.properties && error.properties.errors instanceof Array) {
          const errorMessages = error.properties.errors
            .map(function (error) {
              return error.properties.explanation;
            })
            .join("\n");
          console.log("errorMessages", errorMessages);
          // errorMessages is a humanly readable message looking like this :
          // 'The tag beginning with "foobar" is unopened'
        }
        throw error;
      }

      var zip = new PizZip(content);
      var doc;
      try {
        doc = new window.docxtemplater(zip, {
          nullGetter() {
            return "";
          },
        });
      } catch (error) {
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
        year0Exists: data.year0Exists,
        year1Exists: data.year1Exists,
        year2Exists: data.year2Exists,
        year3Exists: data.year3Exists,
        year4Exists: data.year4Exists,
        year5Exists: data.year5Exists,
        year0: data.years.year0,
        year1: data.years.year1,
        year2: data.years.year2,
        year3: data.years.year3,
        year4: data.years.year4,
        year5: data.years.year5,
      });
      try {
        // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
        doc.render();
      } catch (error) {
        // Catch rendering errors (errors relating to the rendering of the template : angularParser throws an error)
        errorHandler(error);
      }

      var out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }); //Output the document using Data-URI
      saveAs(out, `${data.progCode} ${data.progTitle}.docx`);
    });
    $('#generate-btn').removeClass('hide');
    $('.loading').addClass('hide');    
  } catch (err) {
    $('#generate-btn').removeClass('hide');
    $('.loading').addClass('hide'); 
    $('#alert').text('Spec could not be generated, please try again')
    $('#modal1').modal('open');
    console.error("ERROR - index.js - generate", err);
  }
}
