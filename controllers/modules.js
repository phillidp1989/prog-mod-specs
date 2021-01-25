const path = require("path");
const csv = require("csvtojson");

const requireUncached = mod => {
  delete require.cache[require.resolve(mod)];
  return require(mod);
}

const module2020 = requireUncached('./module2020.json');
const module2021 = requireUncached('./module2021.json');

// Function to generate spec
const moduleData = async (req, res, next) => {

  selectedModule = req.params.modCode;
  selectedYear = req.params.year;

  let data;

  selectedYear === '2020' ? data = module2020.data : data = module2021.data;
  const final = data.filter((mod) => mod.code === selectedModule)

  res.status(200).json(final[0]);
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
