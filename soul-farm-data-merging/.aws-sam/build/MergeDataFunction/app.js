// const axios = require('axios')
// const url = 'http://checkip.amazonaws.com/';
let response;
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("./credentials.json");

const monthlySpreadsheet = "1L1eJbvm0Cfc-Vu6WKpDw7GvEnfS9aVaQ-6lYj5XSIo4";
const weeklySpreadsheet = "1L_toI9ygkyfgp48mg8xB6bpSLNboMFT9az3PaI6_LAI";
const orderSpreadsheet = "1Hsfk1UWl4M_vjR_K4ugt8JjrWj-L49yeIqwAIIEjzGY";

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
exports.lambdaHandler = async (event, context) => {
  try {
    // const ret = await axios(url);
    // 1. Collect the details from the weekly order sheet
    const weekly = await getSpreadsheet(weeklySpreadsheet);

    // 2. Collect the details from the monthly order sheet
    const monthly = await getSpreadsheet(monthlySpreadsheet);

    // 3. Map over the monthly, check if they are present in the weekly and append details if so
    const ordersOfMembers = monthly.map((item) => {
      let weeklyData = [];
      if (weekly[item.No]) {
        weeklyData = weekly[item.No];
      }
      return {
        ...weeklyData,
        ...item,
      };
    });

    // 4. Any remaining weekly order add these to the weekly sheets
    const ordersOfNonMembers = monthly.filter(
      (item) => item.No === "No member"
    );

    const orders = [...ordersOfMembers, ...ordersOfNonMembers];

    await writeOrders(orders);

    response = {
      statusCode: 200,
      body: JSON.stringify(monthly),
    };
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
};

async function getSpreadsheet(spreadSheet) {
  var doc = new GoogleSpreadsheet(spreadSheet);
  try {
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const headers = sheet.headerValues.filter((item) => item !== "No");
    const monthlyData = rows.reduce((acc, row) => {
      acc[row.No] = acc[row.No] || [];
      acc[row.No] = Object.fromEntries(
        headers.map((header) => {
          return [header, row[header]];
        })
      );
      return acc;
    }, []);
    return monthlyData;
  } catch (err) {
    console.log(err);
  }
}

async function writeOrders(orders) {
  console.log("got here");
  var doc = new GoogleSpreadsheet(orderSpreadsheet);
  try {
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    console.log(orders);
    await sheet.addRows(orders);
    return true;
  } catch (err) {
    console.log(err);
  }
}
