const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server has started");
    });
  } catch (error) {
    console.log(`DB Error: &{error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertStateDataToResponseData = (dbObject) => {
  const { state_id, state_name, population } = dbObject;
  return {
    stateId: state_id,
    stateName: state_name,
    population,
  };
};
const convertDistrictDataToResponseData = (dbObject) => {
  const {
    district_id,
    district_name,
    state_id,
    cases,
    cured,
    active,
    deaths,
  } = dbObject;
  return {
    districtId: district_id,
    districtName: district_name,
    stateId: state_id,
    cases,
    cured,
    active,
    deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state`;
  const dbData = await db.all(getStatesQuery);
  response.send(
    dbData.map((eachData) => convertStateDataToResponseData(eachData))
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
  SELECT 
  * 
  FROM 
    state 
  WHERE 
    state_id=${stateId};`;

  const stateDetails = await db.get(getStateQuery);
  response.send(convertStateDataToResponseData(stateDetails));
});

app.post("/districts/", async (request, response) => {
  try {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrictsDataQuery = `
  INSERT INTO 
    district 
   (district_name,state_id,cases,cured,active,deaths)
   VALUES
   ('${districtName}',${stateId},${cases},${cured},${active},${deaths})
  `;
    const dbResponse = await db.run(updateDistrictsDataQuery);
    const districtId = dbResponse.lastID;
    response.send("District Successfully Added");
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
  SELECT 
  * 
  FROM 
    district 
  WHERE 
    district_id=${districtId};`;

  const districtDetails = await db.get(getDistrictQuery);
  response.send(convertDistrictDataToResponseData(districtDetails));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const delDistrictQuery = `
  DELETE FROM  
    district 
  WHERE 
    district_id=${districtId};`;

  await db.run(delDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
  UPDATE district
  SET
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
  WHERE 
    district_id=${districtId}
  `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
  SELECT 
  SUM(cases) AS totalCases,
  sUM(cured) AS totalCured,
  SUM(active) AS totalActive,
  SUM(deaths) AS totalDeaths 
  FROM 
    district 
  WHERE 
    state_id=${stateId};`;

  const stateDetails = await db.get(getStateQuery);
  response.send(stateDetails);
});

app.get("/districts/:districtId/details", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
  SELECT 
    state.state_name
  FROM 
    district INNER JOIN state ON state.state_id=district.state_id
  WHERE 
    district_id=${districtId};`;

  const districtDetails = await db.get(getDistrictQuery);
  response.send(convertStateDataToResponseData(districtDetails));
});
module.exports = app;
