const path = require("path");
const fs = require("fs");
const csv = require("csvtojson");
if (typeof require !== "undefined") XLSX = require("xlsx");
const striptags = require("striptags");

let filePathSpec;
let filePathProgReqs;
let filePathContactHours;

// Object to hold module information

let newModule = {
  code: "",
  title: "",
  school: "",
  dept: "",
  level: "",
  credits: "",
  semester: "",
  attachedProgs: {
    comp: [],
    optional: [],
  },
  prereqs: [],
  coreqs: [],
  campus: "",
  lecture: 0,
  seminar: 0,
  tutorial: 0,
  project: 0,
  demo: 0,
  practical: 0,
  workshop: 0,
  fieldwork: 0,
  visits: 0,
  work: 0,
  placement: 0,
  independent: 0,
  abroad: 0,
  description: [],
  outcomes: [],
  formative: "",
  summative: "",
  reassessment: "",
  ctExam: false,
  examPeriod: [],
  lead: "",
};

// Function to generate spec
const moduleData = async (req, res, next) => {
  newModule = {
    code: "",
    title: "",
    school: "",
    dept: "",
    level: "",
    credits: "",
    semester: "",
    attachedProgs: {
      comp: [],
      optional: [],
    },
    prereqs: [],
    coreqs: [],
    campus: "",
    lecture: 0,
    seminar: 0,
    tutorial: 0,
    project: 0,
    demo: 0,
    practical: 0,
    workshop: 0,
    fieldwork: 0,
    visits: 0,
    work: 0,
    placement: 0,
    independent: 0,
    abroad: 0,
    description: [],
    outcomes: [],
    formative: [],
    summative: [],
    reassessment: [],
    ctExam: false,
    examPeriod: [],
    lead: "",
  };

  // Prog Attachments
  selectedModule = req.params.modCode;
  selectedYear = req.params.year;

  // const parallel = async () => {
  //   filePathProgReqs = path.join(__dirname, `progreqs${selectedYear}.xlsx`)
  //   const reqsWorkbook = XLSX.readFile(filePathProgReqs);
  //   const sheetNames = reqsWorkbook.SheetNames;
  //   const reqsArr = XLSX.utils.sheet_to_json(reqsWorkbook.Sheets[sheetNames[0]]);
  //   filePathContactHours = path.join(__dirname, `contacthours${selectedYear}.xlsx`);
  // const contactWorkbook = XLSX.readFile(filePathContactHours);
  // const contactSheetNames = contactWorkbook.SheetNames;
  // const contactHoursArray = XLSX.utils.sheet_to_json(contactWorkbook.Sheets[contactSheetNames[0]]);
  // const filteredContactArr = contactHoursArray.filter((mod) =>
  //   mod['Module Code'] === selectedModule
  // )
  // filePathSpec = path.join(__dirname, `modulespec${selectedYear}.csv`);
  // const specArray = csv().fromFile(filePathSpec);

  //   return {
  //     reqsArr: await reqsArr,
  //     filteredContactArr: await filteredContactArr,
  //     specArray: await specArray
  //   }
  // }

  // console.time('parallel')
  // const bigData = await parallel();
  // console.log(bigData);
  // console.timeEnd('parallel')

  filePathProgReqs = path.join(__dirname, `progreqs${selectedYear}.xlsx`);
  const reqsWorkbook = XLSX.readFile(filePathProgReqs);
  const sheetNames = reqsWorkbook.SheetNames;
  const reqsArr = XLSX.utils.sheet_to_json(reqsWorkbook.Sheets[sheetNames[0]]);

  const filteredArr = reqsArr.filter(
    (prog) => prog["Modulecode"] == selectedModule
  );
  filteredArr.forEach((prog) => {
    if (
      prog["Ruledesc OR Ruletext"] === "The following must be taken:" ||
      prog["Ruledesc OR Ruletext"] === "The following modules must be taken:"
    ) {
      if (
        !newModule.attachedProgs.comp.some(
          (el) => el.progCode === prog["Smbpgen Program"]
        )
      ) {
        newModule.attachedProgs.comp.push({
          progCode: prog["Smbpgen Program"],
          progTitle: prog["Smrprle Program Desc"],
        });
      }
    } else {
      if (
        !newModule.attachedProgs.optional.some(
          (el) => el.progCode === prog["Smbpgen Program"]
        )
      ) {
        newModule.attachedProgs.optional.push({
          progCode: prog["Smbpgen Program"],
          progTitle: prog["Smrprle Program Desc"],
        });
      }
    }
  });

  // Contact Hours
  filePathContactHours = path.join(
    __dirname,
    `contacthours${selectedYear}.xlsx`
  );
  const contactWorkbook = XLSX.readFile(filePathContactHours);
  const contactSheetNames = contactWorkbook.SheetNames;
  const contactHoursArray = XLSX.utils.sheet_to_json(
    contactWorkbook.Sheets[contactSheetNames[0]]
  );
  const filteredContactArr = contactHoursArray.filter(
    (mod) => mod["Module Code"] === selectedModule
  );
  if (filteredContactArr.length > 0) {
    if (filteredContactArr[0].Lecture) {
      newModule.lecture = filteredContactArr[0].Lecture;
    }
    if (filteredContactArr[0].Seminar) {
      newModule.seminar = filteredContactArr[0].Seminar;
    }
    if (filteredContactArr[0].Tutorial) {
      newModule.tutorial = filteredContactArr[0].Tutorial;
    }
    if (filteredContactArr[0]["Project Supervision"]) {
      newModule.project = filteredContactArr[0]["Project Supervision"];
    }
    if (filteredContactArr[0].Demonstration) {
      newModule.demo = filteredContactArr[0].Demonstration;
    }
    if (filteredContactArr[0]["Practical Classes and workshops"]) {
      newModule.practical =
        filteredContactArr[0]["Practical Classes and workshops"];
    }
    if (filteredContactArr[0]["Supervised time in studio/workshop"]) {
      newModule.workshop =
        filteredContactArr[0]["Supervised time in studio/workshop"];
    }
    if (filteredContactArr[0].Fieldwork) {
      newModule.fieldwork = filteredContactArr[0].Fieldwork;
    }
    if (filteredContactArr[0]["External Visits"]) {
      newModule.visits = filteredContactArr[0]["External Visits"];
    }
    if (filteredContactArr[0]["Work based learning"]) {
      newModule.work = filteredContactArr[0]["Work based learning"];
    }
    if (filteredContactArr[0]["Guided independent study"]) {
      newModule.independent = filteredContactArr[0]["Guided independent study"];
    }
    if (filteredContactArr[0].Placement) {
      newModule.placement = filteredContactArr[0].Placement;
    }
    if (filteredContactArr[0]["Year Abroad"]) {
      newModule.abroad = filteredContactArr[0]["Year Abroad"];
    }
  }

  // Spec
  filePathSpec = path.join(__dirname, `modulespec${selectedYear}.xlsx`);
  const specWorkbook = XLSX.readFile(filePathSpec);
  const specSheetNames = specWorkbook.SheetNames;
  const specArray = XLSX.utils.sheet_to_json(
    specWorkbook.Sheets[specSheetNames[0]]
  );
  const filteredSpecArray = specArray.filter(
    (mod) => mod["Module Code"] === selectedModule
  );

  // const specArray = await csv().fromFile(filePathSpec);
  // const filteredSpecArray = specArray.filter(
  //   (mod) => mod["Course Number"] == selectedModule
  // );

  newModule.code = selectedModule;
  newModule.title = filteredSpecArray[0]["Module Long title "];
  newModule.school = filteredSpecArray[0]["School Desc"];
  newModule.dept = filteredSpecArray[0]["Dept Desc"];
  newModule.level = filteredSpecArray[0]["Attribute Level Code"];
  newModule.credits = filteredSpecArray[0]["Module credits "];
  newModule.semester = filteredSpecArray[0]["Semester"];
  if (filteredSpecArray[0]["Alll Prerequisite Modules (with Desc)"]) {
    if (
      filteredSpecArray[0]["Alll Prerequisite Modules (with Desc)"].includes(
        "|"
      )
    ) {
      const prereqs = filteredSpecArray[0][
        "Alll Prerequisite Modules (with Desc)"
      ].split("|");
      prereqs.forEach((el) => {
        if (el !== "") {
          newModule.prereqs.push(el);
        }
      });
    } else if (
      filteredSpecArray[0]["Alll Prerequisite Modules (with Desc)"] !== ""
    ) {
      newModule.prereqs.push(
        filteredSpecArray[0]["Alll Prerequisite Modules (with Desc)"]
      );
    }
  }

  if (filteredSpecArray[0]["All Corequisite Modules (with Desc)"]) {
    if (
      filteredSpecArray[0]["All Corequisite Modules (with Desc)"].includes("|")
    ) {
      const coreqs = filteredSpecArray[0][
        "All Corequisite Modules (with Desc)"
      ].split("|");
      coreqs.forEach((el) => {
        newModule.coreqs.push(el);
      });
    } else if (
      filteredSpecArray[0]["All Corequisite Modules (with Desc)"] !== ""
    ) {
      newModule.coreqs.push(
        filteredSpecArray[0]["All Corequisite Modules (with Desc)"]
      );
    }
  }

  const strippedOutcomes = striptags(
    filteredSpecArray[0]["Module outcomes"],
    [],
    "\n"
  );
  const outcomesArr = strippedOutcomes.split("\n");
  outcomesArr.forEach((el) => {
    if (el !== "") {
      if (el !== "By the end of the module students should be able to:") {
        newModule.outcomes.push(el.trim());
      }
    }
  });
  newModule.campus = filteredSpecArray[0]["Delivery location"];
  const strippedDescription = striptags(
    filteredSpecArray[0]["Module description"],
    [],
    "\n"
  );
  const descArr = strippedDescription.split("\n");
  descArr.forEach((el) => {
    if (el !== "") {
      newModule.description.push(el.trim());
    }
  });
  // newModule.description = striptags(filteredSpecArray[0]['Web Course Desc']);
  if (
    filteredSpecArray[0][
      "Method(s) of summative assessment and weighting"
    ].includes("Reassessment:")
  ) {
    const assessment = filteredSpecArray[0][
      "Method(s) of summative assessment and weighting"
    ].split("Reassessment:");
    console.log('assessment', assessment);
    const strippedSummative = striptags(
      assessment[0],
      [],
      "\n"
    );
    console.log('strippedSummative', strippedSummative);
    const strippedReassessment = striptags(
      assessment[1],
      [],
      "\n"
    );
    console.log('strippedReassessment', strippedReassessment);
    const summArr = strippedSummative.split("\n");
    console.log('sumArr', summArr);
    const reArr = strippedReassessment.split("\n");
    console.log('reArr', reArr);
    summArr.forEach((el) => {
      if (el !== "") {
        newModule.summative.push(el.trim());
      }
    });
    reArr.forEach((el) => {
      if (el !== "") {
        newModule.reassessment.push(el.trim());
      }
    });
    // newModule.summative = striptags(assessment[0].trim());
    // newModule.reassessment = striptags(assessment[1].trim());
  } else if (
    filteredSpecArray[0][
      "Method(s) of summative assessment and weighting"
    ].includes("Reassessment")
  ) {
    const assessment = filteredSpecArray[0][
      "Method(s) of summative assessment and weighting"
    ].split("Reassessment");
    const strippedSummative = striptags(
      assessment[0],
      [],
      "\n"
    );
    const strippedReassessment = striptags(
      assessment[1],
      [],
      "\n"
    );
    const summArr = strippedSummative.split("\n");
    const reArr = strippedReassessment.split("\n");
    summArr.forEach((el) => {
      if (el !== "") {
        newModule.summative.push(el.trim());
      }
    });
    reArr.forEach((el) => {
      if (el !== "") {
        newModule.reassessment.push(el.trim());
      }
    });
    // newModule.summative = striptags(assessment[0].trim());
    // newModule.reassessment = striptags(assessment[1].trim());
  } else {
    newModule.summative.push(striptags(
      filteredSpecArray[0][
        "Method(s) of summative assessment and weighting"
      ].trim()
    ));
  }

  if (filteredSpecArray[0]["CT Asmt Ind"] === "Y") {
    newModule.ctExam = true;
    if (filteredSpecArray[0]["Exam Periods"].includes("|")) {
      const periods = filteredSpecArray[0]["Exam Periods"].split("|");
      periods.forEach((el) => {
        newModule.examPeriod.push(el.trim());
      });
    } else {
      newModule.examPeriod.push(filteredSpecArray[0]["Exam Periods"]);
    }
  }

  newModule.lead = filteredSpecArray[0]["Contact"];

  res.status(200).json(newModule);
};

let initialData = {};
const moduleAutocompleteData = async (req, res, next) => {
  let moduleInfo;
  filePathSpec = path.join(__dirname, `module-autocomplete.csv`);
  const specArray = await csv().fromFile(filePathSpec);
  specArray.forEach((mod) => {
    moduleInfo = `${mod["Course Number"]} - ${mod["Course Long Desc"]} (${mod["Section Camp Desc"]})`;
    initialData[moduleInfo] = null;
    // initialData = {
    //   ...initialData,
    //   [moduleInfo]: null,
    // };
  });

  res.status(200).json(initialData);
};

module.exports = {
  moduleData,
  moduleAutocompleteData,
};
