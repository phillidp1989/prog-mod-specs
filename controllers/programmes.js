require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require("path");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let filePathSpec = path.join(__dirname, `progspec2021.csv`);
const csv = require("csvtojson");
let selectedProg = "";
let selectedCohort = "";
let selectedYear = "";
let reqs = "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



const requireUncached = (mod) => {
  delete require.cache[require.resolve(mod)];
  return require(mod);
};

// const prog2020 = requireUncached('./prog2020.json');

const prog2023 = requireUncached("./prog2023.json");
const prog2024 = requireUncached("./prog2024.json");
const prog2025 = requireUncached("./prog2025.json");
// const progterm2020 = requireUncached('./progterm2020.json');
const progterm2023 = requireUncached("./progterm2023.json");
const progterm2024 = requireUncached("./progterm2024.json");
const progterm2025 = requireUncached("./progterm2025.json");

// Function to generate spec
const programmeData = async (req, res, next) => {
  // Spec
  selectedProg = req.params.progCode;
  selectedCohort = req.params.cohort;
  selectedYear = req.params.year;

  if (selectedCohort === "term") {
    reqs = "term";
  } else {
    reqs = "";
  }

  let data;

  if (reqs === "" && selectedYear === "2024") {
    data = prog2024.data;
  } else if (reqs === "" && selectedYear === "2025") {
    data = prog2025.data;  
  } else if (reqs === "" && selectedYear === "2023") {
    data = prog2023.data;
  } else if (reqs === "term" && selectedYear === "2024") {
    data = progterm2024.data;
  } else if (reqs === "term" && selectedYear === "2025") {
    data = progterm2025.data;  
  } else if (reqs === "term" && selectedYear === "2023") {
    data = progterm2023.data;
  }

  function stripTitle(title) {    
    const lower = title.toLowerCase();
      const result = lower
      .replace("with year in computer science", "")
      .replace("and year in computer science", "")
      .replace("with a year in computer science", "")
      .replace("with industrial experience", "")
      .replace("(with international study year)", "")
      .replace("with year abroad and year in computer science", "")
      .replace("with year abroad", "")
      .replace("with placement year", "")
      .replace("(with year abroad)", "")
      .replace("with study abroad", "")
      .replace("(with study abroad)", "")
      .replace("with international study", "")
      .replace("(with international study)", "")
      .replace("with year in industry", "")
      .replace("with industrial year", "")
      .replace("with industrial placement", "")
      .replace("with semester abroad", "")
      .replace("with foundation year", "")
      .replace("with international year", "")
      .replace("with study in continental europe", "")
      .replace("with professional placement", "")
      .replace("with inverted year abroad", "")
      .replace("full-time", "")
      .replace("part-time.", "").trim();
    // console.log(result);
    return result;
    
    // return title
    //   .toLowerCase()
    //   .replace(
    //     "with year in computer science" |
    //     "with a year in computer science" |
    //     "with industrial experience" |
    //     "(with International Study Year)" |
    //     "with Year Abroad and Year in Computer Science" |
    //       "with year abroad" |
    //       "(with year abroad)" |
    //       "with study abroad" |
    //       "(with study abroad)" |
    //       "with international study" |
    //       "with an international study" |
    //       "(with international study)" |
    //       "with year in industry" |
    //       "with industrial year" |
    //       "with industrial placement" |
    //       "with semester abroad"|
    //       "with foundation year"|
    //       "with international year"|
    //       "with international study"|
    //       "with study in continental europe"|
    //       "with professional placement"|
    //       "with inverted year abroad"|
    //       "Full-time"|
    //       "Part-time"
    //       ,
    //     ""
    //   ).trim();
  }

  // console.time('test')
  // const { data } = JSON.parse(fs.readFileSync(path.resolve(__dirname, `prog${reqs}${selectedYear}.json`), 'utf8'))
  // console.timeEnd('test');
  const final = data.filter((prog) => prog.progCode === selectedProg);
  if (final.length > 0) {
  final[0].matchedBoolean = false;  
  
  if (data.some((prog) => stripTitle(prog.progTitle) === stripTitle(final[0].progTitle) && prog.progCode !== final[0].progCode)) {
    console.log('test');
    const matchedProgs = JSON.stringify(
      data.filter((prog) => stripTitle(prog.progTitle) === stripTitle(final[0].progTitle) && prog.progCode !== final[0].progCode).map((prog) => `${prog.progCode} - ${prog.shortTitle}`)
      )
      // Remove duplicates from matchedProgs
      const uniqueMatchedProgs = [...new Set(JSON.parse(matchedProgs))];
      final[0].matchedProgs = uniqueMatchedProgs;
      final[0].matchedBoolean = true;
    }
    
  }
    async function insertData() {
      const { data, error } = await supabase
      .from('specs')
      .insert([{
        prog_or_mod: 'prog',
        code: final[0].progCode,
        title: final[0].progTitle,
        college: final[0].college,
        school: final[0].school,
        department: final[0].dept1,
        year: selectedYear,
      }])
      return data;
    }
    if (final.length > 0) {
    insertData().then((data) => {
      console.log(data);
    });
  }

  res.status(200).json(final[0]);
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
    if (el["Degree Code"] == "071") {
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
      prog["Prog Mode Desc"] === "Full-time" ||
      prog["Prog Mode Desc"] === "Other full-time"
    ) {
      prog["Prog Mode Desc"] = "FT";
    } else if (prog["Prog Mode Desc"] === "Part-time.") {
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
    const progInfo = `${prog["Prog Code"]} - ${prog["Degree Long Desc"]} ${prog["Prog Long Title"]} ${prog["Prog Mode Desc"]} (${prog["Campus Desc"]})`;
    initialData[progInfo] = null;
  });
  res.status(200).json(initialData);
};

module.exports = {
  programmeData,
  autocompleteData,
};
