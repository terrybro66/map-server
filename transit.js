const https = require("https");

const options = {
  method: "GET",
  hostname: "transithq.p.rapidapi.com",
  port: null,
  path: "/directions?origin=shinjuku&language=ja&destination=chiba",
  headers: {
    "x-rapidapi-key": "047d154d22mshbf6de5c2ec90986p1993f6jsnb77e85f5f4dd",
    "x-rapidapi-host": "transithq.p.rapidapi.com",
  },
};

const fetchTransitData = () => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (error) {
          reject(new Error("Failed to parse response as JSON"));
        }
      });

      res.on("error", (error) => {
        reject(error);
      });
    });

    req.end();
  });
};

fetchTransitData()
  .then((data) => {
    console.log("Transit Data:", data);
  })
  .catch((error) => {
    console.error("Error fetching transit data:", error);
  });
