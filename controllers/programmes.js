const path = require("path");
let filePathSpec = path.join(__dirname, `progspec2020.csv`);
let filePathReqs;
let filePathOutcomes;
const csv = require("csvtojson");
if (typeof require !== "undefined") XLSX = require("xlsx");
const striptags = require("striptags");
let selectedProg = "";
let selectedCohort = "";
let selectedYear = "";
let reqs = '';

let year0Exists = false;
let year1Exists = false;
let year2Exists = false;
let year3Exists = false;
let year4Exists = false;
let year5Exists = false;
let partner = false;
let noPartner = true;
let collaboration = false;
let noCollab = true;

// Define object to populate spec
let newProg = {
  progCode: "",
  progTitle: "",
  college: "",
  school: "",
  subject1: "",
  subject2: "",
  subject3: "",
  dept1: "",
  dept2: "",
  mode: "",
  campus: "",
  length: "",
  atas: "",
  deliveringInstitution2: "",
  deliveringInstitution3: "",
  regBody: "",
  aims: [],
  benchmark: "",
  knowledge: {
    outcome: [],
    learning: [],
    assessment: [],
  },
  skills: {
    outcome: [],
    learning: [],
    assessment: [],
  },
  years: {
    year0: {
      yearText: "",
      rules: {
        compulsory: [],
        optional: [],
      },
    },
    year1: {
      yearText: "",
      rules: {
        compulsory: [],
        optional: [],
      },
    },
    year2: {
      yearText: "",
      rules: {
        compulsory: [],
        optional: [],
      },
    },
    year3: {
      yearText: "",
      rules: {
        compulsory: [],
        optional: [],
      },
    },
    year4: {
      yearText: "",
      rules: {
        compulsory: [],
        optional: [],
      },
    },
    year5: {
      yearText: "",
      rules: {
        compulsory: [],
        optional: [],
      },
    },
  },
  collaboration,
  noCollab,
  partner,
  noPartner,
  year0Exists,
  year1Exists,
  year2Exists,
  year3Exists,
  year4Exists,
  year5Exists,
};

// Function to generate spec
const programmeData = async (req, res, next) => {
  newProg = {
    progCode: "",
    progTitle: "",
    college: "",
    school: "",
    subject1: "",
    subject2: "",
    subject3: "",
    dept1: "",
    dept2: "",
    mode: "",
    campus: "",
    length: "",
    atas: "",
    deliveringInstitution2: "",
    deliveringInstitution3: "",
    regBody: "",
    aims: [],
    benchmark: "",
    knowledge: {
      outcome: [],
      learning: [],
      assessment: [],
    },
    skills: {
      outcome: [],
      learning: [],
      assessment: [],
    },
    years: {
      year0: {
        yearText: "",
        rules: {
          compulsory: [],
          optional: [],
        },
      },
      year1: {
        yearText: "",
        rules: {
          compulsory: [],
          optional: [],
        },
      },
      year2: {
        yearText: "",
        rules: {
          compulsory: [],
          optional: [],
        },
      },
      year3: {
        yearText: "",
        rules: {
          compulsory: [],
          optional: [],
        },
      },
      year4: {
        yearText: "",
        rules: {
          compulsory: [],
          optional: [],
        },
      },
      year5: {
        yearText: "",
        rules: {
          compulsory: [],
          optional: [],
        },
      },
    },
    collaboration,
    noCollab,
    partner,
    noPartner,
    year0Exists,
    year1Exists,
    year2Exists,
    year3Exists,
    year4Exists,
    year5Exists,
  };
  // Spec
  selectedProg = req.params.progCode;
  selectedCohort = req.params.cohort;
  selectedYear = req.params.year;

  // filePathSpec = path.join(__dirname, `progspec${selectedYear}.xlsx`);
  filePathSpec = path.join(__dirname, `progspec${selectedYear}.csv`);

  if (selectedCohort === "term") {
    reqs = 'term'
  } else {
    reqs = ''
  }

  filePathReqs = path.join(__dirname, `progreqs${reqs}${selectedYear}.xlsx`)
  filePathOutcomes = path.join(__dirname, `outcomes${selectedYear}.xlsx`);

  const specArray = await csv().fromFile(filePathSpec);
  // const specWorkbook = XLSX.readFile(filePathSpec);
  // const sheetNamesSpec = specWorkbook.SheetNames;
  // const specArray = XLSX.utils.sheet_to_json(specWorkbook.Sheets[sheetNamesSpec[0]]);
  // const filteredSpecArray = specArray.filter(
  //   (prog) => prog["Prog Code"] == selectedProg
  // );
  const filteredSpecArray = specArray.filter(
    (prog) => prog["Prog Code"] == selectedProg
  );
  if (
    filteredSpecArray[0]["Prog Mode Desc"] ===
    "Full-time according to funding coun"
  ) {
    filteredSpecArray[0]["Prog Mode Desc"] = "FT";
  } else if (filteredSpecArray[0]["Prog Mode Desc"] === "Part-time") {
    filteredSpecArray[0]["Prog Mode Desc"] = "PT";
  }
  let abbrDegree = '';
  switch (filteredSpecArray[0]["Degree Long Desc"]) {
    case "Postgraduate Certificate in Education":
      abbrDegree = "PGCE";
      break;
    case "Postgraduate Certificate":
      abbrDegree = "PGCert";
      break;
    case "Doctor of Philosophy":
      abbrDegree = "PhD";
      break;
    case "Doctor of Medicine":
      abbrDegree = "MD";
      break;
    case "Bachelor of Arts":
      abbrDegree = "BA";
      break;
    case "Certificate of Higher Education":
      abbrDegree = "CertHE";
      break;
    case "Master in Science":
      abbrDegree = "MSci";
      break;
    case "Bachelor of Science":
      abbrDegree = "BSc";
      break;
    case "Visiting Research Student":
      abbrDegree = "PG VRS";
      break;
    case "Master of Arts":
      abbrDegree = "MA";
      break;
    case "Master of Science":
      abbrDegree = "MSc";
      break;
    case "Master of Philosophy":
      abbrDegree = "MPhil";
      break;
    case "Postgraduate Diploma":
      abbrDegree = "PGDip";
      break;
    case "Master of Engineering":
      abbrDegree = "MEng";
      break;
    case "Master of Laws":
      abbrDegree = "LLM";
      break;
    case "Subject Knowledge Enhancement":
      abbrDegree = "SKE";
      break;
    case "Advanced Certificate":
      abbrDegree = "AdCert";
      break;
    case "Doctor of Philosophy with Integrated Study":
      abbrDegree = "PhD with Integrated Study";
      break;
    case "Master of Nursing":
      abbrDegree = "MNurs";
      break;
    case "Bachelor of Nursing":
      abbrDegree = "BNurs";
      break;
    case "Bachelor of Music":
      abbrDegree = "BMus";
      break;
    case "Bachelor of Dental Surgery":
      abbrDegree = "BDS";
      break;
    case "Master of Public Health":
      abbrDegree = "MPH";
      break;
    case "Master of Pharmacy":
      abbrDegree = "MPharm";
      break;
    case "Master of Business Administration":
      abbrDegree = "MBA";
      break;
    case "Doctor of Clinical Psychology":
      abbrDegree = "ClinPsyD";
      break;
    case "Doctorate in Forensic Psychology Practice":
      abbrDegree = "ForenPsyD";
      break;
    case "Bachelor of Medicine and Bachelor of Surgery":
      abbrDegree = "MBChB";
      break;
    case "Master of Education":
      abbrDegree = "MEd";
      break;
    case "Master of Research":
      abbrDegree = "MRes";
      break;
    case "Bachelor of Laws":
      abbrDegree = "LLB";
      break;
    case "Master of Public Administration":
      abbrDegree = "MPA";
      break;
    case "Graduate Certificate":
      abbrDegree = "GCert";
      break;
    case "Undergraduate Certificate":
      abbrDegree = "UGCert";
      break;
    case "Undergraduate Diploma":
      abbrDegree = "UGDip";
      break;
    case "Bachelor of Philosophy":
      abbrDegree = "BPhil";
      break;
    case "Bachelor of Engineering":
      abbrDegree = "BEng";
      break;
    case "Doctorate in Sport and Exercise Sciences":
      abbrDegree = "DSportExSc";
      break;
    case "Bachelor of Medical Science":
      abbrDegree = "BMedSc";
      break;
    case "Forensic Clinical Psychology Doctorate":
      abbrDegree = "ForenClinPsyD";
      break;
    default:
      break;
  }

  newProg.college = filteredSpecArray[0]["College Desc"];
  newProg.dept1 = filteredSpecArray[0]["Dept1 Short Desc"];
  newProg.dept2 = filteredSpecArray[0]["Dept2 Short Desc"];
  newProg.school = filteredSpecArray[0]["Division Desc"];
  newProg.progTitle = `${abbrDegree} ${filteredSpecArray[0]["Prog Long Title"]} ${filteredSpecArray[0]["Prog Mode Desc"]}`;
  newProg.mode = filteredSpecArray[0]["Prog Mode Desc"];
  newProg.campus = filteredSpecArray[0]["Campus Desc"];
  newProg.length = `${filteredSpecArray[0]["Length"]} ${filteredSpecArray[0]["UOM Desc"]}`;
  newProg.atas = filteredSpecArray[0]["ATAS Req’d Ind"];
  newProg.deliveringInstitution2 =
    filteredSpecArray[0]["Delivering Institution 2 Desc"];
  newProg.deliveringInstitution3 =
    filteredSpecArray[0]["Delivering Institution 3 Desc"];
  newProg.regBody = filteredSpecArray[0]["Reg Body Desc"];
  newProg.subject1 = filteredSpecArray[0]["Subject1 Code"];
  newProg.subject2 = filteredSpecArray[0]["Subject2 Code"];
  newProg.subject3 = filteredSpecArray[0]["Subject3 Code"];

  // Prog Requirements
  const reqsWorkbook = XLSX.readFile(filePathReqs);
  const sheetNames = reqsWorkbook.SheetNames;
  const reqsArr = XLSX.utils.sheet_to_json(reqsWorkbook.Sheets[sheetNames[0]]);

  const filteredReqsArray = reqsArr.filter(
    (prog) => prog["Smbpgen Program"] == selectedProg
  );


  filteredReqsArray.forEach((row) => {
    const singleModule = {
      moduleCode: row.Modulecode,
      moduleTitle: row["Module Long Title"],
      moduleCredits: row["Scbcrse Credit Hr Low"],
      moduleLevel: row["Attr Level"],
      moduleSemester: row["Stvptrm Desc"],
    };


    newProg.progCode = row["Smbpgen Program"];
    switch (row["Progyear"] || row["Prog Year"]) {
      case "0":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year0.rules.compulsory.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year0.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year0.rules.compulsory.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year0.rules.compulsory[moduleIndex].module.push(
              singleModule
            );
          }
        } else {
          if (
            !newProg.years.year0.rules.optional.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year0.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year0.rules.optional.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year0.rules.optional[moduleIndex].module.push(
              singleModule
            );
          }
        }
        newProg.years.year0.yearText = striptags(row.Areagrouptext);
        break;
      case "1":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year1.rules.compulsory.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year1.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year1.rules.compulsory.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year1.rules.compulsory[moduleIndex].module.push(
              singleModule
            );
          }
        } else {
          if (
            !newProg.years.year1.rules.optional.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year1.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year1.rules.optional.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year1.rules.optional[moduleIndex].module.push(
              singleModule
            );
          }
        }
        newProg.years.year1.yearText = striptags(row.Areagrouptext);
        break;
      case "2":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year2.rules.compulsory.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year2.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year2.rules.compulsory.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year2.rules.compulsory[moduleIndex].module.push(
              singleModule
            );
          }
        } else {
          if (
            !newProg.years.year2.rules.optional.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year2.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year2.rules.optional.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year2.rules.optional[moduleIndex].module.push(
              singleModule
            );
          }
        }
        newProg.years.year2.yearText = striptags(row.Areagrouptext);
        break;
      case "3":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year3.rules.compulsory.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year3.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year3.rules.compulsory.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year3.rules.compulsory[moduleIndex].module.push(
              singleModule
            );
          }
        } else {
          if (
            !newProg.years.year3.rules.optional.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year3.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year3.rules.optional.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year3.rules.optional[moduleIndex].module.push(
              singleModule
            );
          }
        }
        newProg.years.year3.yearText = striptags(row.Areagrouptext);
        break;
      case "4":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year4.rules.compulsory.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year4.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year4.rules.compulsory.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year4.rules.compulsory[moduleIndex].module.push(
              singleModule
            );
          }
        } else {
          if (
            !newProg.years.year4.rules.optional.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year4.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year4.rules.optional.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year4.rules.optional[moduleIndex].module.push(
              singleModule
            );
          }
        }
        newProg.years.year4.yearText = striptags(row.Areagrouptext);
        break;
      case "5":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year5.rules.compulsory.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year5.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year5.rules.compulsory.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year5.rules.compulsory[moduleIndex].module.push(
              singleModule
            );
          }
        } else {
          if (
            !newProg.years.year5.rules.optional.some(
              (el) => el.ruleText === striptags(row["Ruledesc OR Ruletext"])
            )
          ) {
            newProg.years.year5.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [singleModule],
            });
          } else {
            const moduleIndex = newProg.years.year5.rules.optional.findIndex(
              (module) =>
                module.ruleText === striptags(row["Ruledesc OR Ruletext"])
            );
            newProg.years.year5.rules.optional[moduleIndex].module.push(
              singleModule
            );
          }
        }
        newProg.years.year5.yearText = striptags(row.Areagrouptext);
        break;
      default:
        break;
    }
  });

  // Learning Outcomes

  const outcomesWorkbook = XLSX.readFile(filePathOutcomes);
  const outcomesSheetNames = outcomesWorkbook.SheetNames;
  const outcomesArr = XLSX.utils.sheet_to_json(
    outcomesWorkbook.Sheets[outcomesSheetNames[0]]
  );

  const filteredOutcomesArray = outcomesArr.filter(
    (prog) => prog["Prog Code"] == selectedProg
  );

  const strippedAims = striptags(
    filteredOutcomesArray[0]["Educational Aims"],
    [],
    "\n"
  );
  const aimsArr = strippedAims.split("\n");
  aimsArr.forEach((el) => {
    if (el !== "") {
      if (el !== '"') {
        newProg.aims.push(el.trim());
      }
    }
  });

  filteredOutcomesArray.forEach((outcome) => {
    if (!outcome["QAA Benchmark"] === newProg.benchmark) {
      newProg.benchmark = striptags(outcome["QAA Benchmark"]);
    }

    switch (outcome["Outcome Type Code"]) {
      case "K":
        newProg.knowledge.outcome.push(striptags(outcome["Outcome"]));
        if (outcome["Learning and Teaching"]) {
          const strippedLT = striptags(
            outcome["Learning and Teaching"],
            [],
            "\n"
          );
          const ltArr = strippedLT.split("\n");
          ltArr.forEach((el) => {
            if (el !== "") {
              newProg.knowledge.learning.push(el.trim());
            }
          });

        }
        if (outcome["Assessment Methods"]) {
          const strippedAssess = striptags(
            outcome["Assessment Methods"],
            [],
            "\n"
          );
          const assessArr = strippedAssess.split("\n");
          assessArr.forEach((el) => {
            if (el !== "") {
              newProg.knowledge.assessment.push(el.trim());
            }
          });

        }
        break;
      case "S":
        newProg.skills.outcome.push(striptags(outcome["Outcome"]));
        if (outcome["Learning and Teaching"]) {
          const strippedSkillsLT = striptags(
            outcome["Learning and Teaching"],
            [],
            "\n"
          );
          const skillsLTArr = strippedSkillsLT.split("\n");
          skillsLTArr.forEach((el) => {
            if (el !== "") {
              newProg.skills.learning.push(el.trim());
            }
          });

        }
        if (outcome["Assessment Methods"]) {
          const strippedSkillsAssess = striptags(
            outcome["Assessment Methods"],
            [],
            "\n"
          );
          const skillsAssessArr = strippedSkillsAssess.split("\n");
          skillsAssessArr.forEach((el) => {
            if (el !== "") {
              newProg.skills.assessment.push(el.trim());
            }
          });

        }
        break;
      default:
        break;
    }
  });

  if (
    newProg.years.year0.rules.compulsory.length > 0 ||
    newProg.years.year0.rules.optional.length > 0
  ) {
    newProg.year0Exists = true;
  }

  if (
    newProg.years.year1.rules.compulsory.length > 0 ||
    newProg.years.year1.rules.optional.length > 0
  ) {
    newProg.year1Exists = true;
  }

  if (
    newProg.years.year2.rules.compulsory.length > 0 ||
    newProg.years.year2.rules.optional.length > 0
  ) {
    newProg.year2Exists = true;
  }

  if (
    newProg.years.year3.rules.compulsory.length > 0 ||
    newProg.years.year3.rules.optional.length > 0
  ) {
    newProg.year3Exists = true;
  }

  if (
    newProg.years.year4.rules.compulsory.length > 0 ||
    newProg.years.year4.rules.optional.length > 0
  ) {
    newProg.year4Exists = true;
  }

  if (
    newProg.years.year5.rules.compulsory.length > 0 ||
    newProg.years.year5.rules.optional.length > 0
  ) {
    newProg.year5Exists = true;
  }

  if (!newProg.deliveringInstitution2 === "") {
    newProg.collaboration = true;
    newProg.noCollab = false;
  }

  if (!newProg.dept2 === "") {
    newProg.partner = true;
    newProg.noPartner = false;
  }

  res.status(200).json(newProg);
};

let initialData = {};
const autocompleteData = async (req, res, next) => {
  const initialSpecArray = await csv().fromFile(filePathSpec);
  const filteredInitialData = initialSpecArray.filter((el) => {
    if (el["Degree Long Desc"] === "Postgraduate Affiliate") {
      return false;
    }
    if (el["Degree Long Desc"] == "Undergraduate Affiliate") {
      return false;
    }
    if (el["Degree Long Desc"] === "Undergraduate Affiliate") {
      return false;
    }
    if (el["Degree Long Desc"] === "DA wrapper") {
      return false;
    }
    if (el["Degree Long Desc"] === "Certificate") {
      return false;
    }
    if (
      el["Degree Long Desc"] ===
      "Common European Framework of Reference for Languages B2"
    ) {
      return false;
    }
    if (el["Degree Long Desc"] === "Diploma") {
      return false;
    }
    if (el["Degree Long Desc"] === "Doctor of Science") {
      return false;
    }
    if (el["Degree Long Desc"] === "Master of Philosophy") {
      return false;
    }
    if (el["Degree Long Desc"] === "Master of Letters") {
      return false;
    }
    if (el["Degree Long Desc"] === "Doctor of Philosophy") {
      return false;
    }
    if (el["Degree Long Desc"] === "Visiting Research Student") {
      return false;
    }
    if (el["Degree Code"] == "71") {
      return false;
    }

    if (el["Degree Long Desc"].includes("AQ")) {
      return false;
    }
    return true;
  });
  filteredInitialData.forEach((prog) => {
    if (
      prog["Prog Mode Desc"] === "Full-time according to funding coun" ||
      prog["Prog Mode Desc"] === "Other full-time"
    ) {
      prog["Prog Mode Desc"] = "FT";
    } else if (prog["Prog Mode Desc"] === "Part-time") {
      prog["Prog Mode Desc"] = "PT";
    }
    switch (prog["Degree Long Desc"]) {
      case "Postgraduate Certificate in Education":
        prog["Degree Long Desc"] = "PGCE";
        break;
      case "Postgraduate Certificate":
        prog["Degree Long Desc"] = "PGCert";
        break;
      case "Doctor of Philosophy":
        prog["Degree Long Desc"] = "PhD";
        break;
      case "Doctor of Medicine":
        prog["Degree Long Desc"] = "MD";
        break;
      case "Bachelor of Arts":
        prog["Degree Long Desc"] = "BA";
        break;
      case "Certificate of Higher Education":
        prog["Degree Long Desc"] = "CertHE";
        break;
      case "Master in Science":
        prog["Degree Long Desc"] = "MSci";
        break;
      case "Bachelor of Science":
        prog["Degree Long Desc"] = "BSc";
        break;
      case "Visiting Research Student":
        prog["Degree Long Desc"] = "PG VRS";
        break;
      case "Master of Arts":
        prog["Degree Long Desc"] = "MA";
        break;
      case "Master of Science":
        prog["Degree Long Desc"] = "MSc";
        break;
      case "Master of Philosophy":
        prog["Degree Long Desc"] = "MPhil";
        break;
      case "Postgraduate Diploma":
        prog["Degree Long Desc"] = "PGDip";
        break;
      case "Master of Engineering":
        prog["Degree Long Desc"] = "MEng";
        break;
      case "Master of Laws":
        prog["Degree Long Desc"] = "LLM";
        break;
      case "Subject Knowledge Enhancement":
        prog["Degree Long Desc"] = "SKE";
        break;
      case "Advanced Certificate":
        prog["Degree Long Desc"] = "AdCert";
        break;
      case "Doctor of Philosophy with Integrated Study":
        prog["Degree Long Desc"] = "PhD with Integrated Study";
        break;
      case "Doctor of Clinical Psychology":
        prog["Degree Long Desc"] = "ClinPsyD";
        break;
      case "Doctorate in Forensic Psychology Practice":
        prog["Degree Long Desc"] = "ForenPsyD";
        break;
      case "Bachelor of Medicine and Bachelor of Surgery":
        prog["Degree Long Desc"] = "MBChB";
        break;
      case "Master of Education":
        prog["Degree Long Desc"] = "MEd";
        break;
      case "Master of Research":
        prog["Degree Long Desc"] = "MRes";
        break;
      case "Bachelor of Laws":
        prog["Degree Long Desc"] = "LLB";
        break;
      case "Master of Public Administration":
        prog["Degree Long Desc"] = "MPA";
        break;
      case "Graduate Certificate":
        prog["Degree Long Desc"] = "GCert";
        break;
      case "Undergraduate Certificate":
        prog["Degree Long Desc"] = "UGCert";
        break;
      case "Undergraduate Diploma":
        prog["Degree Long Desc"] = "UGDip";
        break;
      case "Bachelor of Philosophy":
        prog["Degree Long Desc"] = "BPhil";
        break;
      case "Bachelor of Engineering":
        prog["Degree Long Desc"] = "BEng";
        break;
      case "Doctorate in Sport and Exercise Sciences":
        prog["Degree Long Desc"] = "DSportExSc";
        break;
      case "Bachelor of Medical Science":
        prog["Degree Long Desc"] = "BMedSc";
        break;
      case "Forensic Clinical Psychology Doctorate":
        prog["Degree Long Desc"] = "ForenClinPsyD";
        break;
        case "Master of Nursing":
          prog["Degree Long Desc"] = "MNurs";
          break;
        case "Bachelor of Nursing":
          prog["Degree Long Desc"] = "BNurs";
          break;
        case "Bachelor of Music":
          prog["Degree Long Desc"] = "BMus";
          break;
        case "Bachelor of Dental Surgery":
          prog["Degree Long Desc"] = "BDS";
          break;
        case "Master of Public Health":
          prog["Degree Long Desc"] = "MPH";
          break;
        case "Master of Pharmacy":
          prog["Degree Long Desc"] = "MPharm";
          break;
        case "Master of Business Administration":
          prog["Degree Long Desc"] = "MBA";
          break;
      default:
        break;
    }
    const progInfo = `${prog["Prog Code"]} - ${prog["Degree Long Desc"]} ${prog["Prog Long Title"]} ${prog["Prog Mode Desc"]}`;
    initialData[progInfo] = null
  });
  res.status(200).json(initialData);
};

module.exports = {
  programmeData,
  autocompleteData,
};
