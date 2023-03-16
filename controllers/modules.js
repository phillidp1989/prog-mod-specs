require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const path = require("path");
const csv = require("csvtojson");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const requireUncached = (mod) => {
  delete require.cache[require.resolve(mod)];
  return require(mod);
};

const module2021 = requireUncached("./module2021.json");
const module2022 = requireUncached("./module2022.json");
const module2023 = requireUncached("./module2023.json");

// Function to remove level from module
const removeLevel = (module) => {
  let newModule = "";
  if (module) {
    newModule = module.replace(/LC\s|LI\s|LH\s|LM\s|LD\s/g, "");
  }
  return newModule;
};

// Function to generate spec
const moduleData = async (req, res, next) => {
  selectedModule = req.params.modCode;
  selectedYear = req.params.year;

  let data;

  switch (selectedYear) {
    case '2021':
      data = module2021.data;   
      break;
    case '2022':
      data = module2022.data;
      break;
    case '2023':
      data = module2023.data;
      break;  
    default:
      break;
  }

  // selectedYear === "2021" ? (data = module2021.data) : (data = module2021.data);
  const final = data.filter((mod) => mod.code === selectedModule);
  final[0].matchedBoolean = false;


    if (
      data.some(
        (mod) =>
          removeLevel(mod.title).toLowerCase() === removeLevel(final[0].title).toLowerCase() &&
          mod.dept === final[0].dept &&
          mod.level === final[0].level &&
          mod.credits === final[0].credits &&
          mod.code !== final[0].code          
      )
    ) {
      const matchedModule = JSON.stringify(
        data
          .filter(
            (mod) =>
              removeLevel(mod.title).toLowerCase() === removeLevel(final[0].title).toLowerCase() &&
              mod.dept === final[0].dept &&
              mod.level === final[0].level &&
              mod.credits === final[0].credits &&
              mod.code !== final[0].code    
          )
          .map(
            (mod) =>
              mod.code +
              " - " +
              mod.title +
              " (" +
              mod.campus +
              ")" +
              " (" +
              mod.semester +
              ")"
          )
      );
      final[0].duplicate = JSON.parse(matchedModule);
      final[0].matchedBoolean = true;
    }   
    
  

    async function insertData() {
      const { data, error } = await supabase
        .from('specs')
        .insert([{
          prog_or_mod: 'mod',
          code: final[0].code,
          title: final[0].title,
          college: final[0].college,
          school: final[0].school,
          department: final[0].dept,
          year: selectedYear,
        }])
        return data;
    }
  
    insertData().then((data) => {
      console.log(data);
    });

  res.status(200).json(final[0]);
};

let initialData = {};
const moduleAutocompleteData = async (req, res, next) => {
  let moduleInfo;
  filePathSpec = path.join(__dirname, `module-autocomplete.csv`);
  const specArray = await csv().fromFile(filePathSpec);
  let camp = "";
  specArray.forEach((mod) => {
    if (mod["Section Camp Desc"]) {
      camp = ` (${mod["Section Camp Desc"]})`;
    }
    moduleInfo = `${mod["Course Number"]} - ${mod["Course Long Desc"]}${camp}`;
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
