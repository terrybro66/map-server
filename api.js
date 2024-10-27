const axios = require("axios"); // Ensure you have axios installed
const transportTypes = {
  train: "Train",
  bus: "Bus",
  aircraft: "Aircraft",
};

const baseURL = "https://api.tokyometroapp.jp/api/v2/datapoints";
const token =
  "620ebb7c8bc13f982014fc2e69e856644f045897a5343175e929d86a82013cdb";

async function fetchTransportData(transportType) {
  let endpoint;

  switch (transportType) {
    case "Train":
      endpoint = "odpt:Train";
      break;
    case "Bus":
      endpoint = "odpt:Bus";
      break;
    case "Aircraft":
      endpoint = "odpt:FlightStatus";
      break;
    default:
      throw new Error("Invalid transport type");
  }

  try {
    // Fetch data from the API using axios
    const response = await axios.get(`${baseURL}`, {
      params: {
        "rdf:type": endpoint,
        "acl:consumerKey": token,
      },
    });

    // Check if the response status is not OK
    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch data for ${transportType}: ${response.statusText}`
      );
    }

    // Return the JSON data
    const data = response.data;
    console.log(`${transportType} data:`, data);
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Example usage: Fetch data for each transport type in the object
async function fetchAllTransportData() {
  const results = {};
  for (const type of Object.values(transportTypes)) {
    try {
      results[type] = await fetchTransportData(type);
    } catch (error) {
      console.error(`Failed to fetch data for ${type}:`, error);
    }
  }
  return results;
}

// Fetch and log all transport data
fetchAllTransportData()
  .then((data) => {
    console.log("All transport data:", data);
  })
  .catch((error) => {
    console.error("Error fetching all transport data:", error);
  });

module.exports = {
  fetchTransportData,
  fetchAllTransportData,
};
