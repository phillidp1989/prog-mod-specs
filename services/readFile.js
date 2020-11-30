const filePathSpec = "./progspec.csv";
const csv = require("csvtojson");
if (typeof require !== "undefined") XLSX = require("xlsx");
const striptags = require("striptags");
let selectedProg = "001D";

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
  aims: "",
  benchmark: "",
  knowledge: {
    outcome: [],
    learning: "",
    assessment: "",
  },
  skills: {
    outcome: [],
    learning: "",
    assessment: "",
  },
  years: {
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
  year1Exists,
  year2Exists,
  year3Exists,
  year4Exists,
  year5Exists,
};

// Function to generate spec
const toJson = async () => {
  // Spec
  const specArray = await csv().fromFile(filePathSpec);
  const filteredSpecArray = specArray.filter(
    (prog) => prog["Prog Code"] == selectedProg
  );
  if (
    filteredSpecArray[0]["Prog Mode Desc"] ===
    "Full-time according to funding coun"
  ) {
    filteredSpecArray[0]["Prog Mode Desc"] = "Full-time";
  }
  newProg.college = filteredSpecArray[0]["College Desc"];
  newProg.dept1 = filteredSpecArray[0]["Dept1 Short Desc"];
  newProg.dept2 = filteredSpecArray[0]["Dept2 Short Desc"];
  newProg.school = filteredSpecArray[0]["Division Desc"];
  newProg.progTitle = `${filteredSpecArray[0]["Degree Long Desc"]} ${filteredSpecArray[0]["Prog Long Title"]} ${filteredSpecArray[0]["Prog Mode Desc"]}`;
  newProg.mode = filteredSpecArray[0]["Prog Mode Desc"];
  newProg.campus = filteredSpecArray[0]["Campus Desc"];
  newProg.length = `${filteredSpecArray[0]["Length"]} ${filteredSpecArray[0]["UOM Desc"]}`;
  newProg.atas = filteredSpecArray[0]["ATAS Req’d Ind"];
  newProg.deliveringInstitution2 =
    filteredSpecArray[0]["Delivering Institution 2 Desc"];
  newProg.deliveringInstitution3 =
    filteredSpecArray[0]["Delivering Institution 3 Desc"];
  newProg.regBody = filteredSpecArray[0]["Reg Body Desc"];
  newProg.subject1 = `${filteredSpecArray[0]["Subject1 Code"]} ${filteredSpecArray[0]["Subject1 Desc"]}`;
  newProg.subject2 = `${filteredSpecArray[0]["Subject2 Code"]} ${filteredSpecArray[0]["Subject2 Desc"]}`;
  newProg.subject3 = `${filteredSpecArray[0]["Subject3 Code"]} ${filteredSpecArray[0]["Subject3 Desc"]}`;

  // Prog Requirements
  const reqsWorkbook = XLSX.readFile("./progreqs.xlsx");
  const sheetNames = reqsWorkbook.SheetNames;
  const reqsArr = XLSX.utils.sheet_to_json(reqsWorkbook.Sheets[sheetNames[0]]);

  const filteredReqsArray = reqsArr.filter(
    (prog) => prog["Smbpgen Program"] == selectedProg
  );

  filteredReqsArray.forEach((row) => {
    newProg.progCode = row["Smbpgen Program"];
    switch (row["Progyear"] || row["Prog Year"]) {
      case "1":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year1.rules.compulsory.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year1.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year1.rules.compulsory.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year1.rules.compulsory[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        } else {
          if (
            !newProg.years.year1.rules.optional.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year1.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year1.rules.optional.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year1.rules.optional[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        }
        newProg.years.year1.yearText = striptags(row.Areagrouptext);
        break;
      case "2":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year2.rules.compulsory.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year2.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year2.rules.compulsory.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year2.rules.compulsory[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        } else {
          if (
            !newProg.years.year2.rules.optional.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year2.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year2.rules.optional.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year2.rules.optional[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        }
        newProg.years.year2.yearText = striptags(row.Areagrouptext);
        break;
      case "3":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year3.rules.compulsory.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year3.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year3.rules.compulsory.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year3.rules.compulsory[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        } else {
          if (
            !newProg.years.year3.rules.optional.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year3.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year3.rules.optional.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year3.rules.optional[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        }
        newProg.years.year3.yearText = striptags(row.Areagrouptext);
        break;
      case "4":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year4.rules.compulsory.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year4.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year4.rules.compulsory.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year4.rules.compulsory[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        } else {
          if (
            !newProg.years.year4.rules.optional.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year4.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year4.rules.optional.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year4.rules.optional[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        }
        newProg.years.year4.yearText = striptags(row.Areagrouptext);
        break;
      case "5":
        if (row["Ruledesc OR Ruletext"] === "The following must be taken:") {
          if (
            !newProg.years.year5.rules.compulsory.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year5.rules.compulsory.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year5.rules.compulsory.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year5.rules.compulsory[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        } else {
          if (
            !newProg.years.year5.rules.optional.some(
              (el) => el.ruleText === row["Ruledesc OR Ruletext"]
            )
          ) {
            newProg.years.year5.rules.optional.push({
              ruleText: striptags(row["Ruledesc OR Ruletext"]),
              module: [
                {
                  moduleCode: row.Modulecode,
                  moduleTitle: row["Module Long Title"],
                  moduleCredits: row["Scbcrse Credit Hr Low"],
                  moduleLevel: row["Attr Level"],
                  moduleSemester: row["Stvptrm Desc"],
                },
              ],
            });
          } else {
            const moduleIndex = newProg.years.year5.rules.optional.findIndex(
              (module) => module.ruleText === row["Ruledesc OR Ruletext"]
            );
            newProg.years.year5.rules.optional[moduleIndex].module.push({
              moduleCode: row.Modulecode,
              moduleTitle: row["Module Long Title"],
              moduleCredits: row["Scbcrse Credit Hr Low"],
              moduleLevel: row["Attr Level"],
              moduleSemester: row["Stvptrm Desc"],
            });
          }
        }
        newProg.years.year5.yearText = striptags(row.Areagrouptext);
        break;
      default:
        break;
    }
  });

  // Learning Outcomes

  const outcomesWorkbook = XLSX.readFile("./outcomes.xlsx");
  const outcomesSheetNames = outcomesWorkbook.SheetNames;
  const outcomesArr = XLSX.utils.sheet_to_json(
    outcomesWorkbook.Sheets[outcomesSheetNames[0]]
  );

  const filteredOutcomesArray = outcomesArr.filter(
    (prog) => prog["Prog Code"] == selectedProg
  );

  filteredOutcomesArray.forEach((outcome) => {
    newProg.aims = striptags(outcome["Educational Aims"]);

    if (!outcome["QAA Benchmark"] === newProg.benchmark) {
      newProg.benchmark = striptags(outcome["QAA Benchmark"]);
    }

    switch (outcome["Outcome Type Code"]) {
      case "K":
        newProg.knowledge.outcome.push(striptags(outcome["Outcome"]));
        if (outcome["Learning and Teaching"]) {
          newProg.knowledge.learning =
            outcome[striptags("Learning and Teaching")];
        }
        if (outcome["Assessment Methods"]) {
          newProg.knowledge.assessment = striptags(
            outcome["Assessment Methods"]
          );
        }
        break;
      case "S":
        newProg.skills.outcome.push(striptags(outcome["Outcome"]));
        if (outcome["Learning and Teaching"]) {
          newProg.skills.learning = striptags(outcome["Learning and Teaching"]);
        }
        if (outcome["Assessment Methods"]) {
          newProg.skills.assessment = striptags(outcome["Assessment Methods"]);
        }
        break;
      default:
        break;
    }
  });

  if (
    newProg.years.year1.rules.compulsory.length > 0 ||
    newProg.years.year1.rules.optional.length > 0
  ) {
    year1Exists = true;
  }

  if (
    newProg.years.year2.rules.compulsory.length > 0 ||
    newProg.years.year2.rules.optional.length > 0
  ) {
    year2Exists = true;
  }

  if (
    newProg.years.year3.rules.compulsory.length > 0 ||
    newProg.years.year3.rules.optional.length > 0
  ) {
    year3Exists = true;
  }

  if (
    newProg.years.year4.rules.compulsory.length > 0 ||
    newProg.years.year4.rules.optional.length > 0
  ) {
    year4Exists = true;
  }

  if (
    newProg.years.year5.rules.compulsory.length > 0 ||
    newProg.years.year5.rules.optional.length > 0
  ) {
    year5Exists = true;
  }

  if (!newProg.deliveringInstitution2 === "") {
    collaboration = true;
    noCollab = false;
  }

  return newProg;
};

module.export = {
  toJson,
}
